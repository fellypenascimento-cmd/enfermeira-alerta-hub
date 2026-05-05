# Corrigir tela branca ao adicionar novo produto

## Causa raiz

Em `src/pages/admin/EstoqueEntrada.tsx`, o `Select` de produtos tem conteúdo condicional **dentro** do `SelectContent`:

```tsx
<SelectContent>
  {loadingProdutos ? <div>Carregando...</div> : produtos.map(...)}
</SelectContent>
```

Esse padrão é exatamente o que já causou crash em outras telas de estoque (Saída, Transferência, Manutenção) — quando a query de `produtos` é invalidada (ex: após criar um novo produto via `useCreateProduto`, que chama `invalidateQueries(['produtos'])`), o Radix UI Select tenta reconciliar a árvore enquanto os filhos mudam de tipo (`<div>` → `<SelectItem>`) e dispara `removeChild on Node`, derrubando a tela inteira.

Conforme já documentado em memória (`select-component-rendering-fix`), a solução é **guardar o componente Select inteiro pelo isLoading**, não os filhos.

## Mudanças

### `src/pages/admin/EstoqueEntrada.tsx`
- No bloco de seleção de produto, mostrar um placeholder/skeleton **fora** do Select enquanto `loadingProdutos === true`. Renderizar o `<Select>` apenas quando os produtos já carregaram.
- Quando lista vazia, manter um Select desabilitado com texto "Nenhum produto cadastrado", sem children condicionais dentro do SelectContent.
- Após criar novo produto via `setShowNovoProduto(true) → submit`, garantir que o `produtoId` seja setado com o ID do produto recém-criado **antes** de voltar ao modo Select (assim a próxima renderização do Select já encontra o item na lista). Hoje isso acontece no submit final via `finalProdutoId`, mas se o usuário cancelar/voltar ao Select sem submeter, os children mudam — vamos adotar o padrão de envolver o Select com guarda completa.

### Envolver a rota com ErrorBoundary
- Em `src/App.tsx`, envolver a rota `/admin/estoque/entrada` com `<ErrorBoundary fallbackMessage="Erro ao carregar entrada de estoque">` (mesmo padrão já usado em `/admin/estoque/saida`). Assim, se algo ainda quebrar, o usuário vê uma mensagem ao invés de tela branca.

## Resultado esperado
- Cadastro de novo produto na tela de entrada funciona sem tela branca.
- Caso outra falha aconteça, o ErrorBoundary mostra mensagem amigável com botão de recarregar.
