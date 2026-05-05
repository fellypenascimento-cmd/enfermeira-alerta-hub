
-- Reset de dados operacionais de estoque
DELETE FROM public.estoque_movimentacoes;
DELETE FROM public.estoque_lotacoes;
DELETE FROM public.estoque_itens;
DELETE FROM public.salas;

-- Remover trigger e função antiga de validação de quantidade
DROP TRIGGER IF EXISTS validate_estoque_quantidade_trigger ON public.estoque_itens;
DROP FUNCTION IF EXISTS public.validate_estoque_quantidade();

-- Remover constraint antiga (se existir)
ALTER TABLE public.estoque_itens DROP CONSTRAINT IF EXISTS estoque_itens_quantidade_check;

-- Remover colunas obsoletas: cada item = 1 equipamento físico
ALTER TABLE public.estoque_itens
  DROP COLUMN IF EXISTS controle_patrimonial,
  DROP COLUMN IF EXISTS quantidade_total,
  DROP COLUMN IF EXISTS quantidade;
