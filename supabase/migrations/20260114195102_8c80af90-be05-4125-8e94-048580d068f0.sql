-- =============================================
-- MÓDULO DE ESTOQUE - TABELAS E POLÍTICAS RLS
-- =============================================

-- Tabela de Produtos/Equipamentos
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Itens de Estoque (cada item individual)
CREATE TABLE public.estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  numero_patrimonio text UNIQUE,
  quantidade integer DEFAULT 1 CHECK (quantidade > 0),
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'baixa')),
  unidade_atual_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  data_entrada timestamptz NOT NULL DEFAULT now(),
  responsavel_entrada_id uuid NOT NULL,
  observacao_entrada text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Movimentações (histórico automático)
CREATE TABLE public.estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'devolucao', 'baixa')),
  data_movimentacao timestamptz NOT NULL DEFAULT now(),
  unidade_origem_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  unidade_destino_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  responsavel_id uuid NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_estoque_itens_produto ON public.estoque_itens(produto_id);
CREATE INDEX idx_estoque_itens_status ON public.estoque_itens(status);
CREATE INDEX idx_estoque_itens_unidade ON public.estoque_itens(unidade_atual_id);
CREATE INDEX idx_estoque_movimentacoes_item ON public.estoque_movimentacoes(item_id);
CREATE INDEX idx_estoque_movimentacoes_tipo ON public.estoque_movimentacoes(tipo);

-- Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Produtos
CREATE POLICY "Admins podem gerenciar produtos"
  ON public.produtos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem ver todos produtos"
  ON public.produtos FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS - Estoque Itens
CREATE POLICY "Admins podem gerenciar estoque"
  ON public.estoque_itens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem ver todo estoque"
  ON public.estoque_itens FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS - Movimentações
CREATE POLICY "Admins podem gerenciar movimentacoes"
  ON public.estoque_movimentacoes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem ver todas movimentacoes"
  ON public.estoque_movimentacoes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estoque_itens_updated_at
  BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();