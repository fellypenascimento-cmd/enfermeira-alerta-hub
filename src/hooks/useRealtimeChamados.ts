import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChamadoNotification } from '@/types/database';
import { toast } from 'sonner';

export function useRealtimeChamados() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [novosCount, setNovosCount] = useState(0);
  const [ultimosChamados, setUltimosChamados] = useState<ChamadoNotification[]>([]);

  const limparContador = useCallback(() => {
    setNovosCount(0);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('chamados-realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chamados',
        },
        async (payload) => {
          try {
            // Buscar detalhes do chamado com unidade
            const { data } = await supabase
              .from('chamados')
              .select('id, numero, data_abertura, unidade:unidades(nome)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const notification: ChamadoNotification = {
                id: data.id,
                numero: data.numero,
                unidade: data.unidade?.nome || null,
                data: data.data_abertura,
              };

              // Adicionar à lista de notificações
              setNovosCount((prev) => prev + 1);
              setUltimosChamados((prev) => [notification, ...prev.slice(0, 4)]);

              // Invalidar queries para atualizar lista de chamados automaticamente
              queryClient.invalidateQueries({ queryKey: ['chamados'] });
              queryClient.invalidateQueries({ queryKey: ['chamados-stats'] });

              // Toast de notificação
              toast.info(`Novo chamado #${data.numero}`, {
                description: data.unidade?.nome ? `Unidade: ${data.unidade.nome}` : 'Nova solicitação',
              });
            }
          } catch (error) {
            console.error('Error fetching chamado details:', error);
          }
        }
      )
      // Escutar eventos de UPDATE (mudança de status)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chamados',
        },
        async (payload) => {
          // Invalidar queries para refletir mudanças de status em tempo real
          queryClient.invalidateQueries({ queryKey: ['chamados'] });
          queryClient.invalidateQueries({ queryKey: ['chamado', payload.new.id] });
          queryClient.invalidateQueries({ queryKey: ['chamados-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return { novosCount, ultimosChamados, limparContador };
}
