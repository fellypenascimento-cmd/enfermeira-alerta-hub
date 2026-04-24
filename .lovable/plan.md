

# Corrigir crash da página de Transferência + melhorar performance do estoque

## Problema 1 — Página em branco na transferência

**Causa raiz:** A query `useEstoqueItensPorProduto(produtoId)` é disparada assim que o equipamento é selecionado. Ela carrega TODOS os itens daquele produto (incluindo os relacionamentos `produto`, `unidade_atual`, `sala`) sem nenhum filtro adicional. Em estoques grandes ou quando o produto tem muitos itens, isso gera um payload pesado e o componente faz um `.filter()` no cliente. Quando o React tenta re-renderizar a lista de checkboxes (mesmo com `modoManual=false`), pode estourar e travar a tela.

Além disso, no hook `useRegistrarTransferencia` (e nos demais), as operações são feitas em **loop sequencial** (`for` com `await`): para cada item são feitas 3 chamadas (SELECT + UPDATE + INSERT). Transferir 10 itens = 30 round-trips ao banco. Isso causa timeout/branco enquanto submete.

## Problema 2 — App pesado / lento

- Múltiplas queries do estoque sem `staleTime`, refetchando a cada foco da janela
- `useEstoqueItensPorProduto` retorna todos os itens mesmo quando só precisamos contar
- Loops sequenciais nas mutações (saída, transferência, manutenção, baixa, retorno)
- `FadeIn` e `Layout` re-renderizando árvores grandes a cada mudança de estado

## Solução

### 1. Função RPC no banco para movimentações em lote
Criar funções PostgreSQL `transferir_itens`, `registrar_saida_itens`, `registrar_manutencao_itens`, `registrar_baixa_itens`, `retornar_itens_estoque` que recebem array de IDs e fazem tudo em **uma única transação** (UPDATE em lote + INSERT das movimentações em lote). Isso reduz N×3 chamadas para 1 chamada.

### 2. Refatorar hooks (`src/hooks/useEstoque.ts`)
- Substituir loops `for await` por chamadas RPC únicas
- Adicionar `staleTime: 30s` nas queries pesadas (`produtos-resumo`, `estoque-itens-produto`, `salas`, `unidades`)
- Em `useEstoqueItensPorProduto`, aceitar filtros opcionais (`unidadeId`, `salaId`, `status`) para filtrar no banco em vez do cliente

### 3. Otimizar `EstoqueTransferencia.tsx`
- Passar filtros direto pra query (`useEstoqueItensPorProduto(produtoId, { status: 'em_uso', unidadeId, salaId })`)
- Só renderizar a lista de checkboxes quando `modoManual === true`
- Mostrar contagem (`em_uso` da unidade) via query leve em vez de carregar lista inteira no modo automático
- Adicionar try/catch com mensagem clara para evitar tela branca

### 4. Aplicar mesmos ganhos nos outros formulários
`EstoqueSaida.tsx`, `EstoqueManutencao.tsx`, `EstoqueBaixa.tsx` — mesmo padrão (filtros no banco, render condicional da lista).

### 5. Performance global
- Configurar `QueryClient` com `staleTime: 10_000` e `refetchOnWindowFocus: false` por padrão
- Memoizar `Layout` e `Sidebar`

## Arquivos
1. **migration** — criar funções RPC para movimentações em lote
2. `src/hooks/useEstoque.ts` — usar RPCs, adicionar staleTime, filtros server-side
3. `src/pages/admin/EstoqueTransferencia.tsx` — render condicional + filtros server-side
4. `src/pages/admin/EstoqueSaida.tsx` — mesmo
5. `src/pages/admin/EstoqueManutencao.tsx` — mesmo
6. `src/pages/admin/EstoqueBaixa.tsx` — mesmo
7. `src/pages/admin/EstoqueDetalhe.tsx` — mesmo
8. `src/main.tsx` ou `src/App.tsx` — config global do QueryClient

## Resultado esperado
- Transferência conclui em < 1s mesmo com 50+ itens
- Sem mais tela em branco
- Navegação entre páginas mais fluida (cache reaproveitado, sem refetch agressivo)

