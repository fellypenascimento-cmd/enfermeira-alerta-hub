

# Reestruturação do Módulo de Estoque

## Resumo

Permitir cadastro de equipamentos com ou sem numero de patrimonio, controle por quantidade ou individual, adicionar patrimonio posteriormente, registrar local especifico na saida e melhorar a exibicao visual dos cards.

---

## 1. Migracoes no Banco de Dados

Adicionar novos campos a tabela `estoque_itens`:
- `controle_patrimonial` (boolean, default false) - indica se o item usa controle por patrimonio
- `quantidade_total` (integer, default 1) - quantidade total para itens sem patrimonio
- `local_especifico` (text, nullable) - local detalhado dentro da unidade (ex: "Sala de Vacina")

Adicionar novo campo a tabela `estoque_movimentacoes`:
- `local_especifico` (text, nullable) - local especifico informado na saida

Garantir que `numero_patrimonio` ja permite NULL (ja esta nullable no schema atual).

Adicionar trigger de validacao: impedir quantidade negativa em `quantidade_total`.

---

## 2. Alteracoes no Hook `useEstoque.ts`

### useCreateEstoqueItem
- Aceitar `controle_patrimonial` e `quantidade_total` nos parametros
- Quando `controle_patrimonial = true`: criar 1 registro por patrimonio (comportamento atual)
- Quando `controle_patrimonial = false`: criar registro unico com `quantidade_total`

### useRegistrarSaida
- Adicionar parametros: `local_especifico`, `quantidade_saida` (para itens sem patrimonio)
- Para itens com patrimonio: comportamento atual (muda status para em_uso)
- Para itens sem patrimonio: subtrair `quantidade_saida` de `quantidade_total`, criar novo registro com a quantidade movida se necessário

### Novo hook: useConverterParaPatrimonial
- Recebe: `itemId`, array de patrimonios, quantidade a converter
- Cria N registros individuais com patrimonio
- Subtrai da `quantidade_total` do item original

### useEstoqueStats
- Ajustar para considerar `quantidade_total` nos calculos

### Tipos (estoque.ts)
- Atualizar `EstoqueItem` com os novos campos

---

## 3. Pagina de Entrada (`EstoqueEntrada.tsx`)

Ajustes no formulario:
- Manter o toggle "Controle por patrimonio" que ja existe
- Quando desativado: salvar com `controle_patrimonial = false` e `quantidade_total = N`
- Quando ativado: gerar campos de patrimonio individuais (comportamento atual)
- Salvar o campo `controle_patrimonial` no banco

---

## 4. Pagina de Saida (`EstoqueSaida.tsx`)

Adicionar novos campos ao formulario:
- **Local Especifico** (campo texto, ex: "Sala de Vacina") - opcional
- **Quantidade a retirar** - visivel apenas para itens sem patrimonio
  - Validar que nao excede `quantidade_total` disponivel

Ajustar logica de submissao:
- Para item com patrimonio: comportamento atual
- Para item sem patrimonio: chamar hook atualizado que subtrai quantidade

---

## 5. Card do Equipamento (`Estoque.tsx`)

Redesenhar o card de cada item na listagem:

**Para itens COM patrimonio:**
```text
+------------------------------------------+
| [icon] Computador          [Em Uso]      |
|   #24671                                 |
|   Unidade: ESF Maria Luiza...            |
|   Local: Sala de Vacina                  |
+------------------------------------------+
```

**Para itens SEM patrimonio:**
```text
+------------------------------------------+
| [icon] Computador          [Disponivel]  |
|   Quantidade: 20                         |
|   Unidade: Almoxarifado Central          |
+------------------------------------------+
```

---

## 6. Detalhe do Equipamento (`EstoqueDetalhe.tsx`)

- Exibir `local_especifico` quando disponivel
- Exibir `quantidade_total` para itens sem patrimonio
- No historico de movimentacoes, exibir a descricao/observacao da saida de forma destacada
- Adicionar botao "Adicionar Patrimonio" para itens sem patrimonio

---

## 7. Funcionalidade "Adicionar Patrimonio Posteriormente"

Nova secao no `EstoqueDetalhe.tsx` (ou dialog/modal):
- Visivel apenas para itens com `controle_patrimonial = false` e `quantidade_total > 0`
- Permite informar N patrimonios para converter
- Cria registros individuais e reduz `quantidade_total` do item original

---

## 8. Pagina de Baixa (`EstoqueBaixa.tsx`)

Ajustar para suportar os dois tipos:
- Para itens com patrimonio: selecao individual (atual)
- Para itens sem patrimonio: campo de quantidade a dar baixa
- Subtrair da `quantidade_total`

---

## 9. Relatorios (`EstoqueRelatorios.tsx`)

- Incluir coluna "Qtd Total" e "Local" na tabela e exportacoes
- Ajustar PDF e Excel para incluir os novos campos

---

## Sequencia de Implementacao

1. Migracao do banco (novos campos)
2. Atualizar tipos TypeScript
3. Atualizar hooks (useEstoque)
4. Atualizar EstoqueEntrada
5. Atualizar EstoqueSaida (com local especifico e quantidade)
6. Atualizar Estoque (cards visuais)
7. Atualizar EstoqueDetalhe (local, descricao, botao patrimonio)
8. Atualizar EstoqueBaixa
9. Atualizar EstoqueRelatorios

