-- Adicionar foreign keys para relacionar com profiles
ALTER TABLE public.estoque_itens 
ADD CONSTRAINT estoque_itens_responsavel_entrada_id_fkey 
FOREIGN KEY (responsavel_entrada_id) REFERENCES public.profiles(id);

ALTER TABLE public.estoque_movimentacoes 
ADD CONSTRAINT estoque_movimentacoes_responsavel_id_fkey 
FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id);

-- Adicionar FK para atendente nos chamados (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chamados_atendente_id_fkey'
  ) THEN
    ALTER TABLE public.chamados 
    ADD CONSTRAINT chamados_atendente_id_fkey 
    FOREIGN KEY (atendente_id) REFERENCES public.profiles(id);
  END IF;
END $$;