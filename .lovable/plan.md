

# Reformulação do Layout do Estoque

## Resumo

Reorganizar as duas telas principais do estoque (listagem e detalhe) para um layout profissional com barra de ações, indicadores, filtros e ações rápidas.

---

## 1. Tela Principal (`Estoque.tsx`)

### Estrutura atual vs nova

**Atual**: Header com muitos botoes espalhados + stats + lista
**Novo**: Layout em 3 blocos claros

### Bloco 1 — Barra superior compacta
- Busca de equipamento (campo search, ja existe)
- Botao "+ Novo Equipamento" (link para /entrada)
- Botao "Movimentar" (dropdown com Saida, Transferencia, Retorno, Manutencao, Baixa)
- Botao "Relatorios"

### Bloco 2 — Indicadores (4 cards, ja existem, reorganizar para 4 colunas)
- Total de Equipamentos
- Em Uso
- Estoque Central (renomear "Disponivel" para "Estoque Central")
- Em Manutencao

Remover card de "Baixa" do topo (informacao secundaria).

### Bloco 3 — Lista de equipamentos com filtros
- Adicionar filtros inline acima da lista: Status (todos/disponivel/em_uso/manutencao), Categoria
- Manter cards de produto como estao (nome, total, em uso, estoque)
- Botao "Ver detalhes" explicito em cada card

---

## 2. Tela de Detalhe (`EstoqueDetalhe.tsx`)

### Estrutura nova

**Bloco 1 — Header** (ja existe, manter)
- Nome do produto, categoria, botao voltar

**Bloco 2 — Resumo** (ja existe, manter 5 cards)

**Bloco 3 — Acoes rapidas** (NOVO)
Linha de botoes abaixo do resumo:
- Enviar para Unidade → link `/admin/estoque/saida`
- Transferir → link `/admin/estoque/transferencia`
- Retornar ao Estoque → acao inline ou link
- Enviar para Manutencao → link `/admin/estoque/manutencao`
- Dar Baixa → link `/admin/estoque/baixa`

**Bloco 4 — Distribuicao** (ja existe, manter)
- Por Unidade
- Por Sala
- Patrimonios

**Bloco 5 — Historico** (ja existe, manter)

---

## Arquivos a editar

1. **`src/pages/admin/Estoque.tsx`** — Reorganizar header com barra compacta, renomear labels, adicionar filtros de status/categoria, remover card de baixa do topo
2. **`src/pages/admin/EstoqueDetalhe.tsx`** — Adicionar secao de acoes rapidas com 5 botoes entre o resumo e a distribuicao

Nenhuma alteracao de banco de dados ou hooks necessaria. Apenas UI.

