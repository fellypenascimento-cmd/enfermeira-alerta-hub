import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationPreferences {
  push_enabled: boolean;
  sound_enabled: boolean;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const { user, isAdmin } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    sound_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const vapidKeyRef = useRef<string | null>(null);

  // Buscar VAPID key da edge function
  const fetchVapidKey = useCallback(async (): Promise<string | null> => {
    if (vapidKeyRef.current) return vapidKeyRef.current;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error) throw error;
      vapidKeyRef.current = data.vapidPublicKey;
      return data.vapidPublicKey;
    } catch (error) {
      console.error('[Push] Erro ao buscar VAPID key:', error);
      return null;
    }
  }, []);

  // Verificar suporte a push notifications
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Carregar preferências do usuário
  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            push_enabled: data.push_enabled ?? true,
            sound_enabled: data.sound_enabled ?? true,
          });
        }

        // Verificar se já está subscrito
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await (registration as any).pushManager?.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, isAdmin]);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[Push] Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('[Push] Erro ao registrar Service Worker:', error);
      return null;
    }
  }, [isSupported]);

  // Solicitar permissão e criar subscription
  const requestPermission = useCallback(async () => {
    if (!isSupported || !isAdmin || !user) {
      toast.error('Notificações não suportadas ou usuário não autorizado');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Permissão de notificações negada');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Push] Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão de notificações');
      return false;
    }
  }, [isSupported, isAdmin, user]);

  // Criar subscription push
  const subscribe = useCallback(async () => {
    if (!isSupported || !isAdmin || !user) {
      console.error('[Push] Pré-requisitos não atendidos para subscription');
      return false;
    }

    try {
      // Buscar VAPID key
      const vapidKey = await fetchVapidKey();
      if (!vapidKey) {
        toast.error('Erro ao obter chave de notificação');
        return false;
      }

      // Primeiro, solicitar permissão se necessário
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      // Registrar ou obter service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        toast.error('Erro ao registrar service worker');
        return false;
      }

      await navigator.serviceWorker.ready;

      // Criar subscription
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      console.log('[Push] Subscription criada:', subscription);

      // Extrair chaves
      const subscriptionJSON = subscription.toJSON();
      const p256dh = subscriptionJSON.keys?.p256dh || '';
      const auth = subscriptionJSON.keys?.auth || '';

      // Salvar no banco
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      // Garantir que preferências existem
      await supabase
        .from('admin_notification_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: true,
          sound_enabled: preferences.sound_enabled,
        }, {
          onConflict: 'user_id'
        });

      setIsSubscribed(true);
      setPreferences(prev => ({ ...prev, push_enabled: true }));
      toast.success('Notificações push ativadas!');
      return true;
    } catch (error) {
      console.error('[Push] Erro ao criar subscription:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    }
  }, [isSupported, isAdmin, user, permission, requestPermission, registerServiceWorker, preferences.sound_enabled, fetchVapidKey]);

  // Remover subscription
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      // Remover do browser
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager?.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remover do banco
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Atualizar preferências
      await supabase
        .from('admin_notification_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: false,
          sound_enabled: preferences.sound_enabled,
        }, {
          onConflict: 'user_id'
        });

      setIsSubscribed(false);
      setPreferences(prev => ({ ...prev, push_enabled: false }));
      toast.success('Notificações push desativadas');
      return true;
    } catch (error) {
      console.error('[Push] Erro ao remover subscription:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    }
  }, [user, preferences.sound_enabled]);

  // Toggle push
  const togglePush = useCallback(async () => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  // Toggle som
  const toggleSound = useCallback(async () => {
    if (!user) return false;

    const newValue = !preferences.sound_enabled;

    try {
      const { error } = await supabase
        .from('admin_notification_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: preferences.push_enabled,
          sound_enabled: newValue,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, sound_enabled: newValue }));
      toast.success(newValue ? 'Som de notificação ativado' : 'Som de notificação desativado');
      return true;
    } catch (error) {
      console.error('[Push] Erro ao alterar som:', error);
      toast.error('Erro ao alterar configuração de som');
      return false;
    }
  }, [user, preferences]);

  return {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    togglePush,
    toggleSound,
  };
}
