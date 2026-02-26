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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request has apikey header (sent by database trigger)
    const apiKey = req.headers.get('apikey');
    const expectedAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!apiKey || apiKey !== expectedAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate and parse payload
    let payload: PushPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.chamado_id || payload.numero === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Payload da notificação
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

    console.log('[Push] Notificação preparada:', notificationData);
    
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
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
