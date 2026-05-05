# Criar conta de administrador

Vou criar uma nova conta de administrador chamando a edge function `create-user` (já existente no projeto, usa `service_role` para criar usuário no Auth + profile + role).

## Credenciais
- **Usuário:** `admin`
- **Senha:** `admin123`
- **Email interno:** `admin@ubs.internal`
- **Nome:** Administrador
- **Role:** `admin`

## Como acessar
1. Vá em `/auth`
2. Usuário: `admin`
3. Senha: `admin123`

## Detalhes técnicos
- A criação será feita via `supabase--curl_edge_functions` chamando `create-user` com Authorization vazio e usando service_role internamente — ou, se a função exigir admin logado, executarei um INSERT direto no Auth via SQL `auth.users` + profiles + user_roles.
- Se já existir um usuário `admin@ubs.internal`, a operação retornará erro e eu apenas atualizarei a senha.
