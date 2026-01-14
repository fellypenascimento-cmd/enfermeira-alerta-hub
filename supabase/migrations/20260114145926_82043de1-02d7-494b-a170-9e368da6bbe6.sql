-- Adicionar constraint UNIQUE para permitir UPSERT
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Inserir role para usuário existente sem role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('b6bcb0dd-a8d3-47e6-8b21-98d23298e91f', 'enfermeira')
ON CONFLICT DO NOTHING;