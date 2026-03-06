
-- 1. Create salas table
CREATE TABLE public.salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for salas
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar salas"
  ON public.salas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados podem ver salas ativas"
  ON public.salas FOR SELECT
  TO authenticated
  USING (ativa = true);

-- 2. Add sala_id to estoque_lotacoes
ALTER TABLE public.estoque_lotacoes
  ADD COLUMN sala_id uuid REFERENCES public.salas(id) ON DELETE SET NULL;

-- 3. Add sala columns to estoque_movimentacoes
ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN sala_origem_id uuid REFERENCES public.salas(id) ON DELETE SET NULL,
  ADD COLUMN sala_destino_id uuid REFERENCES public.salas(id) ON DELETE SET NULL;

-- 4. Add sala_id to estoque_itens
ALTER TABLE public.estoque_itens
  ADD COLUMN sala_id uuid REFERENCES public.salas(id) ON DELETE SET NULL;
