import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChamadoNotification } from '@/types/database';
import { toast } from 'sonner';
import { useNotificationSound } from './useNotificationSound';

export function useRealtimeChamados() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [novosCount, setNovosCount] = useState(0);
  const [ultimosChamados, setUltimosChamados] = useState<ChamadoNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { soundEnabled, toggleSound, playNotificationSound } = useNotificationSound();
  const hasLoggedConnection = useRef(false);

  const limparContador = useCallback(() => {
    setNovosCount(0);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      console.log('[Realtime] Usuário não é admin, subscription não iniciada');
      return;
    }

    console.log('[Realtime] Iniciando subscription para chamados...');

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
          console.log('[Realtime] INSERT recebido:', payload.new.id);
          
          // Invalidar queries IMEDIATAMENTE para garantir atualização
          queryClient.invalidateQueries({ queryKey: ['chamados'] });
          queryClient.invalidateQueries({ queryKey: ['chamados-stats'] });

          // Tocar som de notificação
          playNotificationSound();

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

              // Toast de notificação
              toast.info(`Novo chamado #${data.numero}`, {
                description: data.unidade?.nome ? `Unidade: ${data.unidade.nome}` : 'Nova solicitação',
              });
            }
          } catch (error) {
            console.error('[Realtime] Erro ao buscar detalhes:', error);
            // Mesmo com erro, as queries já foram invalidadas acima
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chamados',
        },
        (payload) => {
          console.log('[Realtime] UPDATE recebido:', payload.new.id);
          // Invalidar queries para refletir mudanças de status em tempo real
          queryClient.invalidateQueries({ queryKey: ['chamados'] });
          queryClient.invalidateQueries({ queryKey: ['chamado', payload.new.id] });
          queryClient.invalidateQueries({ queryKey: ['chamados-stats'] });
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Status da conexão:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (!hasLoggedConnection.current) {
            console.log('[Realtime] ✓ Conectado com sucesso!');
            hasLoggedConnection.current = true;
          }
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.error('[Realtime] Erro no canal:', err);
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          console.warn('[Realtime] Conexão expirou');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log('[Realtime] Canal fechado');
        }
      });

    return () => {
      console.log('[Realtime] Removendo canal...');
      hasLoggedConnection.current = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient, playNotificationSound]);

  return { 
    novosCount, 
    ultimosChamados, 
    limparContador, 
    isConnected,
    soundEnabled,
    toggleSound
  };
}
