ALTER TABLE public.estoque_itens DROP CONSTRAINT IF EXISTS estoque_itens_quantidade_check;
ALTER TABLE public.estoque_itens ADD CONSTRAINT estoque_itens_quantidade_check CHECK (quantidade >= 0);