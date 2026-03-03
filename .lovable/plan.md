

# Correção da Lógica de Lotações no Módulo de Estoque

## Problema Raiz

O `useRegistrarSaida` **não sincroniza** a tabela `estoque_lotacoes`. Quando uma saída é registrada para uma unidade, o registro de lotação não é criado/atualizado. Resultado: o dropdown de "Unidade de Origem" mostra dados incompletos porque a tabela `estoque_lotacoes` está desatualizada.

Dados atuais do item TECLADO (`dc546eee`):
- `estoque_lotacoes`: apenas 1 registro (ESF JARDIM ORIENTE = 9)
- `estoque_movimentacoes`: saídas para 3 unidades diferentes (JARDIM ORIENTE, SECRETARIA, PRIMAVERA)
- Nenhuma das saídas populou a tabela de lotações corretamente

## Correções

### 1. Corrigir `useRegistrarSaida` (`src/hooks/useEstoque.ts`)

Adicionar lógica de upsert na tabela `estoque_lotacoes` ao registrar uma saída para itens não patrimoniais:
- Verificar se já existe lotação para item+unidade
- Se sim, incrementar quantidade
- Se não, criar novo registro
- Incluir `quantidade_movimentada` na movimentação

### 2. Recalcular lotações existentes via migração SQL

Criar migração que recalcula as lotações a partir do histórico de movimentações, para corrigir os dados existentes que estão inconsistentes. A lógica:
- Para cada item, calcular saldo por unidade baseado em saídas menos liberações/transferências
- Recriar registros em `estoque_lotacoes` com os saldos corretos

### 3. Ajustar `quantidade_total` no `estoque_itens`

O campo `quantidade_total` em `estoque_itens` deve representar a quantidade disponível em estoque geral (não lotada). Atualmente está com 9, mas todos os 9 estão lotados em ESF JARDIM ORIENTE. Após a migração, recalcular este campo também.

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/hooks/useEstoque.ts` | Adicionar sync de `estoque_lotacoes` no `useRegistrarSaida` |
| Migração SQL | Recalcular lotações existentes a partir do histórico |

