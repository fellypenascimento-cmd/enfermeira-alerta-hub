# Corrigir erro de transferência de equipamento

## Causa
O constraint `estoque_movimentacoes_tipo_check` no banco aceita apenas:
`'entrada', 'saida', 'devolucao', 'baixa'`

Mas as funções RPC criadas recentemente (`transferir_itens`, `registrar_manutencao_itens`, etc.) inserem os tipos:
- `'transferencia'` — usado em transferências
- `'manutencao'` — usado em envio para manutenção
- `'retorno_manutencao'` — usado no retorno

Por isso, ao registrar uma transferência, o Postgres rejeita o INSERT.

## Solução
Criar migration que recria o constraint incluindo todos os tipos válidos do sistema:

```sql
ALTER TABLE public.estoque_movimentacoes
  DROP CONSTRAINT estoque_movimentacoes_tipo_check;

ALTER TABLE public.estoque_movimentacoes
  ADD CONSTRAINT estoque_movimentacoes_tipo_check
  CHECK (tipo IN (
    'entrada',
    'saida',
    'transferencia',
    'devolucao',
    'manutencao',
    'retorno_manutencao',
    'baixa'
  ));
```

## Resultado
Transferências, envios para manutenção e retornos passam a ser registrados normalmente, sem afetar movimentações já existentes (todos os tipos antigos continuam válidos).
