

# Reset Completo do Banco de Dados

## Resumo
Apagar todos os dados operacionais, remover todos os usuarios existentes (via edge function com service role key), e criar apenas:
- 1 usuario admin: `cpd` / `123456` / "Administrador CPD"
- 1 unidade: "CPD"

## Etapas

### 1. Criar Edge Function temporaria `admin-reset-db`
Esta funcao vai:
1. Deletar dados das tabelas na ordem correta (respeitando foreign keys):
   - `estoque_movimentacoes`
   - `estoque_lotacoes`
   - `estoque_itens`
   - `chamados_historico`
   - `chamados`
   - `push_subscriptions`
   - `admin_notification_preferences`
   - `user_roles`
   - `profiles`
   - `salas`
   - `unidades`
   - `problemas`
   - `produtos`
2. Deletar todos os usuarios do Supabase Auth (via admin API)
3. Criar novo usuario admin via `auth.admin.createUser`:
   - email: `cpd@ubs.internal`
   - password: `123456`
   - email_confirm: true
   - metadata: nome "Administrador CPD"
4. Inserir profile com username `cpd`
5. Inserir role `admin` na tabela `user_roles`
6. Criar unidade "CPD" na tabela `unidades`

### 2. Executar a edge function
Chamar via curl para executar o reset.

### 3. Deletar a edge function temporaria
Remover `admin-reset-db` apos execucao.

### 4. Atualizar constante ADMIN_MASTER_USERNAME
No arquivo `src/pages/admin/Usuarios.tsx`, alterar a constante de `fellyperocha33` para `cpd`.

## Arquivos
1. `supabase/functions/admin-reset-db/index.ts` (criar, executar, deletar)
2. `src/pages/admin/Usuarios.tsx` (alterar ADMIN_MASTER_USERNAME)

## Credenciais finais
- **Usuario:** `cpd`
- **Senha:** `123456`

