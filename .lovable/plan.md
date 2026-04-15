

# Corrigir campo Cargo/Título — Usar lista predefinida

## Problema
O campo "Cargo / Título" é texto livre, permitindo que qualquer valor seja digitado (como "tipo de perna"). Isso causa dados inconsistentes.

## Solucao
Substituir o campo de texto livre por um Select (dropdown) com opcoes predefinidas de cargos, mantendo a opcao de digitar um valor customizado.

## Alteracoes

### 1. `src/pages/admin/Usuarios.tsx`
- Substituir o `<Input>` do campo "Cargo / Título" por um `<Select>` com opcoes predefinidas:
  - Diretor(a)
  - Enfermeiro(a)
  - Técnico(a) de Enfermagem
  - Recepcionista
  - Administrador CPD
  - Outro (permite digitar)
- Quando "Outro" for selecionado, exibir um campo de texto adicional para o valor customizado
- Manter o salvamento no campo `perfil_texto` da tabela `profiles`

## Resultado
O admin escolhe de uma lista padronizada, evitando erros de digitacao e dados inconsistentes. Valores customizados ainda sao permitidos via opcao "Outro".

