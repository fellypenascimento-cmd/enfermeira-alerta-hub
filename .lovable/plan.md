

# Login com Username (sem @gmail.com)

## Problema
O Supabase Auth exige formato de email. Precisamos permitir login com username simples (ex: `fellype`, `admin`).

## Solucao
Usar um dominio interno ficticio (`@ubs.internal`) de forma transparente. O usuario digita apenas o username, e o sistema adiciona `@ubs.internal` automaticamente antes de enviar ao Supabase Auth.

## Alteracoes

### 1. Banco de dados — Adicionar campo `username` na tabela `profiles`
- Migration: `ALTER TABLE profiles ADD COLUMN username text UNIQUE`
- Criar indice unico para garantir unicidade

### 2. `src/pages/Auth.tsx` — Tela de login
- Trocar campo "Email" por "Usuario"
- Trocar `type="email"` por `type="text"`
- Placeholder: "Digite seu usuario"
- Remover validacao de email do Zod (usar `.min(1)`)
- Antes de chamar `signIn`, converter username para email: `username@ubs.internal`

### 3. `src/contexts/AuthContext.tsx` — Funcao signIn
- Nenhuma alteracao necessaria (ja recebe email como string e passa ao Supabase)

### 4. `supabase/functions/create-user/index.ts` — Edge Function
- Aceitar campo `username` no body
- Gerar email automatico: `username@ubs.internal`
- Salvar o username no profile apos criacao

### 5. `src/pages/admin/Usuarios.tsx` — Formulario de cadastro
- Trocar campo "E-mail" por "Usuario" (text input, sem @)
- Enviar `username` para a edge function ao criar usuario
- Na edicao, mostrar o username extraido do email (remover `@ubs.internal`)
- Remover logica de alteracao de email (substituir por alteracao de username)

### 6. `supabase/functions/update-user-email/index.ts` — Edge Function
- Atualizar para aceitar novo username e converter para `novo_username@ubs.internal`
- Atualizar tambem o campo `username` no profile

### 7. Tabela na lista de usuarios
- Mostrar coluna "Usuario" em vez de "E-mail", exibindo o campo `username` ou extraindo do email

## Regras
- Username deve ser unico (constraint no banco)
- Username so aceita letras, numeros, ponto e underline
- Dominio `@ubs.internal` e invisivel para o usuario
- Login com Google permanece como opcao (se existir na tela de login — atualmente nao esta no Auth.tsx)

## Arquivos a editar
1. Migration SQL (adicionar coluna `username`)
2. `src/pages/Auth.tsx`
3. `supabase/functions/create-user/index.ts`
4. `supabase/functions/update-user-email/index.ts`
5. `src/pages/admin/Usuarios.tsx`

