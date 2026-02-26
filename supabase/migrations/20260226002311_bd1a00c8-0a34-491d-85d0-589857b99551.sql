
-- Add new columns to estoque_itens
ALTER TABLE public.estoque_itens 
  ADD COLUMN IF NOT EXISTS controle_patrimonial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantidade_total integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS local_especifico text;

-- Add local_especifico to estoque_movimentacoes
ALTER TABLE public.estoque_movimentacoes 
  ADD COLUMN IF NOT EXISTS local_especifico text;

-- Backfill: items with numero_patrimonio get controle_patrimonial = true
UPDATE public.estoque_itens 
SET controle_patrimonial = true 
WHERE numero_patrimonio IS NOT NULL;

-- Validation trigger: prevent negative quantidade_total
CREATE OR REPLACE FUNCTION public.validate_estoque_quantidade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.quantidade_total < 0 THEN
    RAISE EXCEPTION 'quantidade_total não pode ser negativa';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_estoque_quantidade_trigger
  BEFORE INSERT OR UPDATE ON public.estoque_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_estoque_quantidade();
