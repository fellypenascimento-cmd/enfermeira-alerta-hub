

# Reformulação Completa do Módulo de Estoque

## Resumo

Refatorar o estoque de uma visão "por item individual" para uma visão "por produto", com controle de distribuição por unidade e sala, novo status de manutenção, e interface simplificada.

## Escopo da Mudança

Este é um refactoring grande que afeta: banco de dados, hooks, tipos, e todas as 6 páginas de estoque.

---

## 1. Alterações no Banco de Dados

### Nova tabela: `salas`
Formalizar o conceito de sala dentro de cada unidade (atualmente é texto livre em `local_especifico`).

```text
salas
├── id (uuid, PK)
├── nome (text) -- Ex: "Recepção", "Sala Vacina"
├── unidade_id (uuid, FK → unidades)
├── ativa (boolean, default true)
├── created_at (timestamp)
```

### Alterações em tabelas existentes

- **`estoque_itens`**: Adicionar status `manutencao`. Trocar `local_especifico` (text) por `sala_id` (FK → salas, nullable). Quando `sala_id` e `unidade_atual_id` são ambos null, o item está no Estoque Central.
- **`estoque_lotacoes`**: Adicionar `sala_id` (FK → salas, nullable) para rastrear distribuição por sala.
- **`estoque_movimentacoes`**: Adicionar tipos `transferencia` e `manutencao`. Adicionar `sala_origem_id` e `sala_destino_id` (FK → salas).

### RLS
- `salas`: Admins podem gerenciar; usuários autenticados podem ver salas ativas.

---

## 2. Tipos TypeScript (`src/types/estoque.ts`)

- Adicionar `'manutencao'` a `EstoqueStatus`
- Adicionar `'transferencia' | 'manutencao'` a `MovimentacaoTipo`
- Adicionar interface `Sala`
- Atualizar `EstoqueItemWithRelations` para incluir `sala`
- Criar tipo `ProdutoResumo` para a tela principal:
```text
ProdutoResumo {
  produto_id, nome, categoria
  total, em_uso, disponivel, manutencao, baixa
}
```

---

## 3. Hooks (`src/hooks/useEstoque.ts`)

### Novos hooks
- **`useProdutosResumo()`**: Agrega `estoque_itens` por `produto_id`, calculando totais por status. Retorna lista de `ProdutoResumo` para a tela principal.
- **`useProdutoDistribuicao(produtoId)`**: Busca lotações + salas para mostrar distribuição por unidade e sala.
- **`useSalas(unidadeId?)`**: CRUD de salas.
- **`useRegistrarTransferencia()`**: Transferência entre unidades (origem → destino + sala).
- **`useRegistrarManutencao()`**: Marcar item como em manutenção.
- **`useRetornarManutencao()`**: Retornar item da manutenção.

### Hooks alterados
- **`useCreateEstoqueItem`**: Destino padrão = Estoque Central (sem unidade/sala).
- **`useRegistrarSaida`**: Exigir `sala_id` junto com `unidade_destino_id`.
- **`useEstoqueStats`**: Incluir contagem de manutenção.

---

## 4. Tela Principal (`Estoque.tsx`)

**Antes**: Lista individual de itens.
**Depois**: Lista agrupada por produto.

```text
┌─────────────────────────────────────────┐
│ COMPUTADOR                              │
│ Total: 20  │  Em uso: 16  │  Estoque: 4 │
├─────────────────────────────────────────┤
│ MONITOR                                 │
│ Total: 30  │  Em uso: 22  │  Estoque: 8 │
├─────────────────────────────────────────┤
│ TECLADO                                 │
│ Total: 50  │  Em uso: 38  │  Estoque: 12│
└─────────────────────────────────────────┘
```

- Cards de resumo no topo: Total, Disponível, Em Uso, Manutenção, Baixa
- Sem exibir unidades nesta tela
- Click no card → detalhe do produto

---

## 5. Tela de Detalhe do Produto (`EstoqueDetalhe.tsx`)

Refatorar para ser uma visão **por produto** (não mais por item individual).

Seções:
1. **Resumo**: Total, Em estoque, Em uso, Em manutenção, Baixa
2. **Distribuição por Unidade**: ESF Jardim Oriente — 6, ESF Primavera — 4...
3. **Distribuição por Sala**: ESF Jardim Oriente > Sala Vacina — 2, Recepção — 1...
4. **Patrimônios** (se houver): Lista de itens patrimoniais com seus números
5. **Histórico de Movimentações**: Timeline completa com origem, destino, sala, quantidade, responsável, descrição

---

## 6. Páginas de Movimentação

### EstoqueEntrada.tsx
- Entrada sempre vai para o Estoque Central (CPD)
- Manter lógica de patrimônio opcional
- Remover campo de unidade/sala (entrada é sempre central)

### EstoqueSaida.tsx
- Selecionar produto → quantidade → unidade destino → sala destino
- Campo de sala é obrigatório
- Validar quantidade disponível no estoque central

### Nova página: EstoqueTransferencia.tsx
- Origem: unidade + sala
- Destino: unidade + sala
- Quantidade
- Registrar movimentação tipo `transferencia`

### Nova página: EstoqueManutencao.tsx
- Selecionar equipamento em uso
- Marcar como manutenção (temporário)
- Opção de retorno ao uso

### EstoqueBaixa.tsx
- Manter lógica atual, adicionar campo de sala

---

## 7. Relatórios (`EstoqueRelatorios.tsx`)

Adicionar novos tipos de relatório:
- Equipamentos por unidade
- Equipamentos por sala
- Equipamentos em manutenção
- Equipamentos baixados

---

## 8. Rotas (`App.tsx`)

Adicionar:
- `/admin/estoque/transferencia` → EstoqueTransferencia
- `/admin/estoque/manutencao` → EstoqueManutencao
- Alterar `/admin/estoque/:id` para receber `produto_id` em vez de `item_id`

---

## Sequência de Implementação

Devido ao tamanho, sugiro dividir em **3 fases**:

**Fase 1** — Banco + Tipos + Hooks base
- Migração SQL (salas, alterações em tabelas)
- Atualizar tipos TypeScript
- Criar hooks de agregação (`useProdutosResumo`, `useSalas`)

**Fase 2** — Telas principais
- Refatorar Estoque.tsx (visão por produto)
- Refatorar EstoqueDetalhe.tsx (detalhe do produto)
- Atualizar EstoqueEntrada.tsx e EstoqueSaida.tsx

**Fase 3** — Novas funcionalidades
- Criar EstoqueTransferencia.tsx
- Criar EstoqueManutencao.tsx
- Atualizar EstoqueRelatorios.tsx
- Atualizar rotas e navegação

