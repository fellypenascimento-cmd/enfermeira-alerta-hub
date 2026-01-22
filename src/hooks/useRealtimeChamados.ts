import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRealtimeChamados() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const hasSubscribed = useRef(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAdmin) {
      return;
    }

    // Evita múltiplas subscriptions
    if (hasSubscribed.current) return;
    hasSubscribed.current = true;

    console.log('[Realtime] Iniciando subscription...');

    const channel = supabase
      .channel('chamados-admin-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chamados' },
        (payload) => {
          console.log('[Realtime] Novo chamado inserido:', payload.new.id);
          
          // Invalida TODAS as queries que começam com 'chamados'
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'chamados' || 
              query.queryKey[0] === 'chamados-stats'
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chamados' },
        (payload) => {
          console.log('[Realtime] Chamado atualizado:', payload.new.id);
          
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'chamados' || 
              query.queryKey[0] === 'chamado' ||
              query.queryKey[0] === 'chamados-stats'
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status:', status);
      });

    return () => {
      console.log('[Realtime] Removendo subscription...');
      hasSubscribed.current = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loading, queryClient]);
}
