
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@ubs.internal';
  v_password text := 'admin123';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('nome','Administrador'),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (id, nome, email, username, ativo)
  VALUES (v_user_id, 'Administrador', v_email, 'admin', true)
  ON CONFLICT (id) DO UPDATE SET nome = 'Administrador', username = 'admin', ativo = true;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
