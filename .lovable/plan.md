

# Corrigir Erro de Constraint na Saída de Estoque

## Problema Identificado

A tabela `estoque_itens` possui um CHECK constraint antigo:
```
estoque_itens_quantidade_check: CHECK (quantidade > 0)
```

Quando um item sem patrimônio tem toda a quantidade retirada (ex: 1 unidade disponível, saída de 1), o código tenta definir `quantidade: 0`, o que viola essa constraint.

## Solução

Duas correções necessárias:

### 1. Migração no banco de dados
Substituir o CHECK constraint para permitir `quantidade >= 0`:
```sql
ALTER TABLE public.estoque_itens DROP CONSTRAINT IF EXISTS estoque_itens_quantidade_check;
ALTER TABLE public.estoque_itens ADD CONSTRAINT estoque_itens_quantidade_check CHECK (quantidade >= 0);
```

### 2. Correção no hook `useRegistrarSaida` (linha 231-241)
Atualmente o código define `quantidade: novaQtd` onde `novaQtd` pode ser 0. Mesmo com a correção do constraint, a lógica deve ser mais defensiva:
- Quando `novaQtd === 0` e o item é sem patrimônio, definir `quantidade: 0` e `status: 'em_uso'`
- O campo `quantidade_total` já é validado pelo trigger (permite >= 0)

### 3. Correção no hook `useRegistrarBaixa` (linha 489-498)
Mesmo problema: define `quantidade: novaQtd` que pode ser 0. Aplicar a mesma correção.

## Arquivos Afetados

- Nova migração SQL (corrigir constraint `quantidade >= 0`)
- `src/hooks/useEstoque.ts` - funções `useRegistrarSaida` e `useRegistrarBaixa`

## Sequência

1. Executar migração para corrigir o CHECK constraint
2. Atualizar o código dos hooks para consistência

