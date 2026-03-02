
# Reverter Teste de Baixa - FILTRO DE LINHA 5

## O que será feito

Restaurar o item "FILTRO DE LINHA 5" (id: `9382a8b7-...`) ao seu estado original antes do teste de baixa:

- `status`: de `baixa` para `disponivel`
- `quantidade`: de `0` para `2`
- `quantidade_total`: de `0` para `2`

Nenhuma movimentacao de baixa foi registrada na tabela `estoque_movimentacoes`, então apenas o item precisa ser atualizado.

## Detalhes Tecnicos

Uma unica operacao UPDATE na tabela `estoque_itens`:

```sql
UPDATE estoque_itens
SET status = 'disponivel', quantidade = 2, quantidade_total = 2
WHERE id = '9382a8b7-734c-4ca7-998d-6e797c5ea855';
```

Nenhum arquivo de codigo sera alterado.
