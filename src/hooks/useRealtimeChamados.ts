import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Som de notificação usando Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Primeiro beep - A5 (880Hz)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
    gainNode1.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.2);
    
    // Segundo beep - C6 (1046.5Hz) - mais agudo
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(1046.5, audioContext.currentTime);
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0, audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
        gain2.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
        gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.25);
      } catch (e) {
        // Ignora erros no segundo beep
      }
    }, 150);
    
  } catch (error) {
    console.log('[Sound] Não foi possível tocar som:', error);
  }
}

// Debounce para evitar múltiplos sons em sequência
let lastSoundTime = 0;
const SOUND_DEBOUNCE_MS = 2000;

async function getSoundPreference(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('admin_notification_preferences')
      .select('sound_enabled')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Default é true se não existir preferência
    return data?.sound_enabled ?? true;
  } catch {
    return true;
  }
}

export function useRealtimeChamados() {
  const { isAdmin, loading, user } = useAuth();
  const queryClient = useQueryClient();
  const hasSubscribed = useRef(false);
  const processedIds = useRef<Set<string>>(new Set());

  // Função para disparar notificação in-app com som
  const notifyNewChamado = useCallback(async (chamadoId: string, numero: number) => {
    // Evita processar o mesmo chamado múltiplas vezes
    if (processedIds.current.has(chamadoId)) {
      return;
    }
    processedIds.current.add(chamadoId);
    
    // Limpa IDs antigos para não crescer indefinidamente
    if (processedIds.current.size > 100) {
      const ids = Array.from(processedIds.current);
      processedIds.current = new Set(ids.slice(-50));
    }

    // Tocar som se habilitado e com debounce
    const now = Date.now();
    if (user && now - lastSoundTime > SOUND_DEBOUNCE_MS) {
      const soundEnabled = await getSoundPreference(user.id);
      if (soundEnabled) {
        lastSoundTime = now;
        playNotificationSound();
      }
    }

    // Toast visual
    toast.info(`Novo chamado #${numero}`, {
      description: 'Um novo chamado foi aberto no sistema',
      duration: 5000,
    });
  }, [user]);

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
        async (payload) => {
          const newChamado = payload.new as { id: string; numero: number };
          console.log('[Realtime] Novo chamado inserido:', newChamado.id);
          
          // Invalida queries para atualizar a lista
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'chamados' || 
              query.queryKey[0] === 'chamados-stats'
          });

          // Notificar com som e toast
          notifyNewChamado(newChamado.id, newChamado.numero);
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
  }, [isAdmin, loading, queryClient, notifyNewChamado]);
}
