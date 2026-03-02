

# Corrigir Página de Saída de Estoque (Tela em Branco)

## Problema
A página de "Saída de Produtos" (`/admin/estoque/saida`) não carrega e fica em branco ao ser acessada.

## Diagnóstico
Após revisão detalhada do código:
- As rotas estão corretamente configuradas em `App.tsx`
- Os hooks (`useEstoqueItens`, `useRegistrarSaida`) estão estruturalmente corretos
- As queries ao banco retornam dados válidos (9 itens com status "disponivel" confirmados)
- Os tipos TypeScript estão alinhados com o schema do banco

A tela em branco geralmente indica um erro de compilação silencioso ou crash no render do React. Para identificar a causa exata, será necessário:

## Plano de Ação

### 1. Navegar até a página com ferramentas de browser
Usar as ferramentas de automação para acessar `/admin/estoque/saida` e capturar:
- Erros no console do navegador
- Screenshot do estado atual da página
- Qualquer mensagem de erro React

### 2. Identificar e corrigir o erro
Com base no erro encontrado, aplicar a correção necessária. Os cenários mais prováveis são:
- **Erro de importação**: algum componente ou ícone não encontrado
- **Erro de tipo TypeScript**: incompatibilidade entre tipos do Supabase e tipos locais
- **Crash no render**: acesso a propriedade de objeto undefined durante renderização
- **Erro no hook**: problema com o `useAuth()` ou `useEstoqueItens()` durante inicialização

### 3. Verificar que a saída funciona de ponta a ponta
Após a correção, testar:
- Página carrega com lista de itens disponíveis
- Seleção de item funciona (patrimonial e por quantidade)
- Submissão do formulário registra a saída corretamente

## Detalhes Técnicos

Arquivos envolvidos:
- `src/pages/admin/EstoqueSaida.tsx` - componente da página
- `src/hooks/useEstoque.ts` - hooks de dados (`useEstoqueItens`, `useRegistrarSaida`)
- `src/types/estoque.ts` - tipos TypeScript

