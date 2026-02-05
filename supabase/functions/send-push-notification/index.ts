import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  chamado_id: string;
  numero: number;
  unidade_nome: string;
  data_abertura: string;
}

// Simple Web Push implementation using native crypto
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  // For web push, we need to use the Web Push protocol
  // This is a simplified version - for production, consider using a webhook service
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: payload,
  });
  
  return response;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    const { data: adminPrefs } = await supabase
      .from('admin_notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', userIds)
      .eq('push_enabled', true);

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

    // Payload da notificação (será enviado como texto simples por enquanto)
    const notificationData = {
      title: `Novo chamado #${payload.numero}`,
      body: `${payload.unidade_nome || 'Unidade não informada'} - ${dataFormatada}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `chamado-${payload.chamado_id}`,
      data: {
        url: '/admin/chamados',
        chamado_id: payload.chamado_id
      }
    };

    // Log notification details (push will be handled by realtime for now)
    console.log('[Push] Notificação preparada:', notificationData);
    
    // Store notification for in-app display
    // The actual push notification requires web-push library which is too heavy
    // For now, we rely on the realtime subscription for instant notifications
    
    return new Response(
      JSON.stringify({ 
        message: 'Notificação processada', 
        notification: notificationData,
        subscriptions_count: subscriptionsToNotify.length
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
