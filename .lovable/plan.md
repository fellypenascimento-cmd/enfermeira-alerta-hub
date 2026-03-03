

# Melhorias na Visualização de Lotações e Histórico

## Alterações

### 1. Seção "Unidades Atuais" (`EstoqueDetalhe.tsx`)

Substituir o bloco estático "Localização Atual" (que mostra apenas `unidade_atual`) por uma seção dinâmica que lista todas as lotações ativas vindas de `estoque_lotacoes`.

Para itens não patrimoniais:
```
Unidades Atuais
  ESF Primavera — 2 un. (Sala de Vacina)
  ESF Jardim Oriente — 1 un.
  Estoque Geral — 7 un.
```

Para itens patrimoniais, manter o comportamento atual (uma única unidade).

A quantidade "Estoque Geral" será calculada como: `quantidade_total - soma das lotações`.

### 2. Histórico Expandível com Quantidade

Cada card de movimentação no histórico passará a ser **expandível** (clicável). No estado colapsado, mostra tipo, data e quantidade. Ao expandir, mostra todos os detalhes (origem, destino, local, responsável, descrição).

Usar o componente `Collapsible` já existente no projeto.

A quantidade movimentada será exibida de forma proeminente no cabeçalho do card (ex: "Saída — 2 un.").

### 3. Hook `useRegistrarSaida` — sincronizar lotações

Atualmente o `useRegistrarSaida` não cria/atualiza registros em `estoque_lotacoes`. Adicionar lógica de upsert na lotação de destino ao registrar saída, e registrar `quantidade_movimentada` na movimentação.

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/admin/EstoqueDetalhe.tsx` | Seção "Unidades Atuais" + histórico expandível |
| `src/hooks/useEstoque.ts` | `useRegistrarSaida` sincroniza `estoque_lotacoes` e grava `quantidade_movimentada` |

Nenhuma migração de banco necessária.

