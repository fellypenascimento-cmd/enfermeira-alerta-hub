# Itens disponíveis no CPD não aparecem para alocar

## Causa
Quando um item é transferido para a unidade CPD, o backend corretamente define `status = 'disponivel'` mas **mantém `unidade_atual_id = CPD`** (não vira `NULL`). No banco hoje há:
- 1 item disponível sem unidade
- 2 itens disponíveis alocados ao CPD

Total = 3 (o que aparece no resumo).

Porém, na tela **Saída para Unidade**, a seleção automática filtra apenas itens com `unidade_atual_id IS NULL` (`pickItems` recebe `unidadeId: null`). Resultado: os 2 itens do CPD ficam invisíveis para alocação, e quando o usuário tenta enviar dá "0 disponível".

O mesmo problema aparece no modo manual da tela: o filtro `i.status === 'disponivel' && !i.unidade_atual_id` esconde itens do CPD.

## Correção

**`src/hooks/useEstoque.ts` — `useRegistrarSaida`**
Remover o filtro `unidadeId: null` na chamada `pickItems`. Qualquer item com `status = 'disponivel'` (esteja sem unidade ou no CPD) deve ser elegível para saída.

**`src/pages/admin/EstoqueSaida.tsx`**
Ajustar a lista do modo manual para mostrar itens disponíveis independentemente da unidade:
```ts
itensProduto.filter(i => i.status === 'disponivel')
```
(remover o `&& !i.unidade_atual_id`).

## Resultado
Os 3 computadores aparecem corretamente como disponíveis e podem ser alocados a uma unidade. Histórico de movimentação (origem CPD → destino unidade) continua sendo registrado normalmente pela RPC `registrar_saida_itens`.
