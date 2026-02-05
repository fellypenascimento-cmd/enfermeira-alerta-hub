-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Tabela para preferências de notificação do admin
CREATE TABLE public.admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies para push_subscriptions (apenas admins podem gerenciar suas subscriptions)
CREATE POLICY "Admins podem gerenciar suas subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Policies para admin_notification_preferences
CREATE POLICY "Admins podem gerenciar suas preferências"
ON public.admin_notification_preferences
FOR ALL
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Policy para edge function buscar subscriptions de admins ativos
CREATE POLICY "Service pode ler subscriptions de admins ativos"
ON public.push_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = push_subscriptions.user_id
    AND p.ativo = true
  )
  AND has_role(push_subscriptions.user_id, 'admin'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_notification_preferences_updated_at
BEFORE UPDATE ON public.admin_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();