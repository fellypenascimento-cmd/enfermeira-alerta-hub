

# Ajustes Visuais e Funcionais no Módulo de Estoque

## Resumo

Quatro alterações principais: simplificar os cards na listagem, mover detalhes para o histórico, adicionar tipo "liberação" de movimentação, e criar funcionalidade "Liberar da Unidade".

---

## 1. Simplificar Card na Listagem (`Estoque.tsx`)

No card de cada item, remover unidade, local específico e patrimônio. Exibir apenas:
- Nome do equipamento
- Quantidade disponível (para itens sem patrimônio) ou número de patrimônio (para patrimoniais)

Remover os ícones/textos de `Building2`, `MapPin` e `local_especifico` do card da listagem.

## 2. Botão "Ver Histórico" no Card

Adicionar um botão "Ver Histórico" no card que leva à página de detalhe (`/admin/estoque/:id`), que já possui o histórico completo com unidade, local, data, tipo e descrição da movimentação.

O link já existe (o card inteiro é clicável), mas adicionaremos um botão explícito para maior clareza.

## 3. Nova Funcionalidade: "Liberar Equipamento"

### Tipo de movimentação
Adicionar `'liberacao'` ao tipo de movimentação no TypeScript (`MovimentacaoTipo`).

### Hook `useRegistrarLiberacao` (`useEstoque.ts`)
Nova mutation que:
- Remove `unidade_atual_id` (seta como `null`)
- Remove `local_especifico` (seta como `null`)
- Mantém status `disponivel`
- Registra movimentação do tipo `liberacao`
- Valida: não permite liberar item que já está sem unidade

### UI na página de detalhe (`EstoqueDetalhe.tsx`)
- Adicionar botão "Liberar da Unidade" visível quando o item tem `unidade_atual_id` e status diferente de `baixa`
- Dialog de confirmação antes de executar
- Após liberação, atualizar dados na tela

### Config visual do tipo
Adicionar `liberacao` ao `tipoMovimentacaoConfig` no detalhe com label "Liberação" e cor apropriada.

## 4. Remover Console Logs de Debug (`EstoqueSaida.tsx`)

Remover o `useEffect` com `console.log` de debug (linhas 39-48).

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/types/estoque.ts` | Adicionar `'liberacao'` ao `MovimentacaoTipo` |
| `src/hooks/useEstoque.ts` | Novo hook `useRegistrarLiberacao` + remover logs |
| `src/pages/admin/Estoque.tsx` | Simplificar card (remover unidade/local) |
| `src/pages/admin/EstoqueDetalhe.tsx` | Botão "Liberar da Unidade" + config `liberacao` |
| `src/pages/admin/EstoqueSaida.tsx` | Remover console.log de debug |

Nenhuma alteração de banco de dados necessária — o campo `tipo` em `estoque_movimentacoes` é `text`, então aceita `'liberacao'` sem migração.

