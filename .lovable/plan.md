

# Ajuste Visual dos Cards de Estoque

## Alteração

Simplificar os cards na listagem principal (`src/pages/admin/Estoque.tsx`, linhas 191-235) removendo informações operacionais e destacando apenas o essencial.

### Remover do card principal (linhas 213-224):
- Unidade atual (`Building2` + `item.unidade_atual.nome`)
- Local específico (`MapPin` + `item.local_especifico`)
- Data de entrada (linha 229-231)

### Manter no card:
- Nome do equipamento
- Patrimônio (para itens patrimoniais) ou **Quantidade disponível** (para itens por quantidade, com destaque visual)
- Badge de status

### Ajuste visual:
- Aumentar destaque da quantidade disponível com texto maior e cor primária
- Manter layout clean com apenas nome + quantidade/patrimônio no lado esquerdo e badge de status no lado direito

As informações removidas (unidade, local) já estão disponíveis na página de detalhe (`EstoqueDetalhe.tsx`) dentro do histórico de movimentações.

