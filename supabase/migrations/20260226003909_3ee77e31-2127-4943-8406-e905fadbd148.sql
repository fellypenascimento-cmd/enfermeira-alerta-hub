
CREATE OR REPLACE FUNCTION public.notify_admins_new_chamado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  unidade_nome TEXT;
  payload JSONB;
  supabase_url TEXT;
  anon_key TEXT;
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
  
  -- Use anon key instead of service role key for calling edge function
  -- The edge function validates requests internally
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    anon_key := current_setting('app.settings.anon_key', true);
    
    IF supabase_url IS NULL OR anon_key IS NULL THEN
      RAISE WARNING 'Push notification settings not configured (supabase_url or anon_key missing)';
      RETURN NEW;
    END IF;
    
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', anon_key
      ),
      body := payload
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao enviar notificação push: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;
