-- Criar função para notificar admins via edge function
CREATE OR REPLACE FUNCTION public.notify_admins_new_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unidade_nome TEXT;
  payload JSONB;
BEGIN
  -- Buscar nome da unidade
  SELECT nome INTO unidade_nome
  FROM public.unidades
  WHERE id = NEW.unidade_id;
  
  -- Preparar payload
  payload := jsonb_build_object(
    'chamado_id', NEW.id,
    'numero', NEW.numero,
    'unidade_nome', COALESCE(unidade_nome, 'Unidade não informada'),
    'data_abertura', NEW.data_abertura
  );
  
  -- Chamar edge function via pg_net (http extension)
  -- Esta chamada é assíncrona e não bloqueia a transação
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := payload
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não falha a inserção do chamado
    RAISE WARNING 'Erro ao enviar notificação push: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger para disparar notificação em novos chamados
DROP TRIGGER IF EXISTS trigger_notify_new_chamado ON public.chamados;
CREATE TRIGGER trigger_notify_new_chamado
  AFTER INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_chamado();