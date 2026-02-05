import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push library - usando importação ESM
// @ts-ignore
import * as webPush from 'https://esm.sh/web-push@3.6.7';

interface PushPayload {
  chamado_id: string;
  numero: number;
  unidade_nome: string;
  data_abertura: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    // Configurar VAPID
    webPush.setVapidDetails(
      'mailto:admin@tochahelp.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear payload do chamado
    const payload: PushPayload = await req.json();
    console.log('[Push] Payload recebido:', payload);

    // Buscar todas as subscriptions de admins ativos
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select(`
        id,
        user_id,
        endpoint,
        p256dh,
        auth
      `);

    if (subError) {
      console.error('[Push] Erro ao buscar subscriptions:', subError);
      throw subError;
    }

    console.log(`[Push] Encontradas ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma subscription encontrada', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar quais usuários são admins ativos com push habilitado
    const userIds = subscriptions.map(s => s.user_id);
    
    const { data: adminPrefs, error: prefsError } = await supabase
      .from('admin_notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', userIds)
      .eq('push_enabled', true);

    if (prefsError) {
      console.error('[Push] Erro ao buscar preferências:', prefsError);
    }

    const enabledUserIds = new Set(adminPrefs?.map(p => p.user_id) || []);
    
    // Se não há preferências, assume que todos podem receber (default enabled)
    const subscriptionsToNotify = subscriptions.filter(s => 
      enabledUserIds.size === 0 || enabledUserIds.has(s.user_id)
    );

    console.log(`[Push] ${subscriptionsToNotify.length} subscriptions com push habilitado`);

    // Formatar data
    const dataAbertura = new Date(payload.data_abertura);
    const dataFormatada = dataAbertura.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Payload da notificação
    const notificationPayload = JSON.stringify({
      title: `Novo chamado #${payload.numero}`,
      body: `${payload.unidade_nome || 'Unidade não informada'} - ${dataFormatada}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `chamado-${payload.chamado_id}`,
      data: {
        url: '/admin/chamados',
        chamado_id: payload.chamado_id
      }
    });

    // Enviar notificações
    const results = await Promise.allSettled(
      subscriptionsToNotify.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webPush.sendNotification(pushSubscription, notificationPayload);
          console.log(`[Push] Notificação enviada para user ${sub.user_id}`);
          return { success: true, user_id: sub.user_id };
        } catch (error: any) {
          console.error(`[Push] Erro ao enviar para user ${sub.user_id}:`, error);
          
          // Se a subscription expirou ou é inválida, remover
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[Push] Removendo subscription inválida: ${sub.id}`);
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, user_id: sub.user_id, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`[Push] Resultado: ${successful} enviadas, ${failed} falhas`);

    return new Response(
      JSON.stringify({ 
        message: 'Notificações processadas', 
        sent: successful,
        failed: failed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Push] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
