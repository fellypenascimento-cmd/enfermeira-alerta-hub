# Popular o sistema com dados de teste

## O que encontrei no banco (antes de criar nada)
- Apenas **1 usuário comum** ativo (com unidade vinculada) — os 20 chamados ficarão todos com ele.
- **Nenhuma sala cadastrada** — a saída para unidades exige sala.
- O sistema tem só 3 status de chamado: **Aberto, Em atendimento, Resolvido**. "Em espera" e "Respondido" não existem.
- 9 unidades ativas (CPD + 8). Produtos já existentes: SSD 250 GB, Memória DDR3 8GB, PC Completo, Monitor (faltam Teclado, Mouse, Impressora, Nobreak).

## Proposta
Todos os registros levam a marca **[TESTE]** (no texto/observação, nome de sala e produto) para remoção posterior fácil.

1. **Chamados (20)** com o usuário comum existente e sua unidade, problemas típicos (impressora, e-SUS PEC, rede...). Mapeamento de status:
   - Aberto 7 | Em atendimento 8 (cobre "em espera"+"respondido") | Resolvido 5 (com mensagem de finalização)
   - Mudanças de status pelas funções normais do sistema; respostas identificadas como "[SIMULAÇÃO]".
   - Notificações push/som desligadas durante a carga (sem envio em massa).
2. **Salas de teste**: criar 1 sala "[TESTE] Sala TI" em 4 unidades.
3. **Estoque (90 itens)** no CPD, individualizados, sem patrimônio; criar os 4 produtos faltantes com sufixo [TESTE].
4. **Movimentações** pelas funções em lote já existentes: 4 PCs, 3 monitores, 5 teclados, 2 impressoras para unidades distintas; retorno de 1 PC ao CPD; manutenção e retorno de 1 PC; baixa de 1 monitor e 1 teclado.
5. **Patrimônio**: atribuir "TESTE-0001..." a alguns itens e testar recusa de duplicado.
6. **Relatório final** com contagens e classificação APROVADO / REPROVADO / NÃO TESTADO, mais erros e correções sugeridas.
7. Testes de notificação ao vivo ficam como **NÃO TESTADO** (precisam de execução controlada por você).

## Remoção posterior
Script pronto para apagar tudo marcado [TESTE] (exige liberação pontual, pois o banco bloqueia exclusão de histórico).
