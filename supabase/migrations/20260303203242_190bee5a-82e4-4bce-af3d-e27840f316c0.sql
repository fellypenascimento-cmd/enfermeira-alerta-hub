
-- Recalculate quantidade_total to represent unallocated stock (estoque geral)
-- For non-patrimonial items: quantidade_total should be the original total minus what's allocated
-- We need to know the original total first. Since quantidade_total currently equals total_lotado for most items,
-- it means the original entry quantity was consumed entirely by allocations.
-- So quantidade_total (estoque geral) should be 0 for those items.

-- For each non-patrimonial item, set quantidade_total = max(0, current_quantidade_total - total_lotado)
-- But looking at data, quantidade_total IS the same as total_lotado, meaning estoque geral = 0
UPDATE estoque_itens ei
SET quantidade_total = GREATEST(0, ei.quantidade_total - COALESCE(
  (SELECT SUM(el.quantidade) FROM estoque_lotacoes el WHERE el.item_id = ei.id), 0
))
WHERE ei.controle_patrimonial = false;

-- Also update status: if quantidade_total = 0 and there are lotações, item is "em_uso"
UPDATE estoque_itens ei
SET status = 'em_uso'
WHERE ei.controle_patrimonial = false
  AND ei.quantidade_total = 0
  AND EXISTS (SELECT 1 FROM estoque_lotacoes el WHERE el.item_id = ei.id AND el.quantidade > 0);

-- Items with quantidade_total > 0 should be 'disponivel'
UPDATE estoque_itens ei
SET status = 'disponivel'
WHERE ei.controle_patrimonial = false
  AND ei.quantidade_total > 0
  AND ei.status != 'baixa';
