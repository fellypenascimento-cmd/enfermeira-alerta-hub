
-- ============================================================
-- RPCs para movimentações em LOTE (1 transação por operação)
-- Reduz N×3 round-trips para 1 chamada única
-- ============================================================

-- Helper: detecta se unidade é CPD (sempre 'disponivel')
CREATE OR REPLACE FUNCTION public._estoque_status_destino(p_unidade_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF p_unidade_id IS NULL THEN RETURN 'disponivel'; END IF;
  SELECT nome INTO v_nome FROM public.unidades WHERE id = p_unidade_id;
  IF v_nome IS NULL THEN RETURN 'em_uso'; END IF;
  IF upper(trim(v_nome)) = 'CPD' OR upper(v_nome) LIKE '%CPD%' THEN
    RETURN 'disponivel';
  END IF;
  RETURN 'em_uso';
END;
$$;

-- ============================================================
-- TRANSFERIR ITENS (em lote)
-- ============================================================
CREATE OR REPLACE FUNCTION public.transferir_itens(
  p_item_ids uuid[],
  p_unidade_destino uuid,
  p_sala_destino uuid,
  p_data timestamptz,
  p_observacao text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_count int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  v_status := public._estoque_status_destino(p_unidade_destino);

  -- Insere histórico ANTES de atualizar (preserva origem)
  INSERT INTO public.estoque_movimentacoes (
    item_id, tipo, data_movimentacao,
    unidade_origem_id, sala_origem_id,
    unidade_destino_id, sala_destino_id,
    responsavel_id, observacao, quantidade_movimentada
  )
  SELECT
    i.id, 'transferencia', p_data,
    i.unidade_atual_id, i.sala_id,
    p_unidade_destino, p_sala_destino,
    auth.uid(), COALESCE(p_observacao, 'Transferência entre unidades'), 1
  FROM public.estoque_itens i
  WHERE i.id = ANY(p_item_ids);

  UPDATE public.estoque_itens
  SET status = v_status,
      unidade_atual_id = p_unidade_destino,
      sala_id = p_sala_destino,
      updated_at = now()
  WHERE id = ANY(p_item_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- SAÍDA DE ITENS
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_saida_itens(
  p_item_ids uuid[],
  p_unidade_destino uuid,
  p_sala_destino uuid,
  p_data timestamptz,
  p_observacao text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_count int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  v_status := public._estoque_status_destino(p_unidade_destino);

  INSERT INTO public.estoque_movimentacoes (
    item_id, tipo, data_movimentacao,
    unidade_origem_id, sala_origem_id,
    unidade_destino_id, sala_destino_id,
    responsavel_id, observacao, quantidade_movimentada
  )
  SELECT
    i.id, 'saida', p_data,
    i.unidade_atual_id, i.sala_id,
    p_unidade_destino, p_sala_destino,
    auth.uid(), COALESCE(p_observacao, 'Saída para unidade'), 1
  FROM public.estoque_itens i
  WHERE i.id = ANY(p_item_ids);

  UPDATE public.estoque_itens
  SET status = v_status,
      unidade_atual_id = p_unidade_destino,
      sala_id = p_sala_destino,
      updated_at = now()
  WHERE id = ANY(p_item_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- MANUTENÇÃO
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_manutencao_itens(
  p_item_ids uuid[],
  p_data timestamptz,
  p_observacao text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  INSERT INTO public.estoque_movimentacoes (
    item_id, tipo, data_movimentacao,
    unidade_origem_id, sala_origem_id,
    responsavel_id, observacao, quantidade_movimentada
  )
  SELECT
    i.id, 'manutencao', p_data,
    i.unidade_atual_id, i.sala_id,
    auth.uid(), COALESCE(p_observacao, 'Equipamento em manutenção'), 1
  FROM public.estoque_itens i
  WHERE i.id = ANY(p_item_ids);

  UPDATE public.estoque_itens
  SET status = 'manutencao',
      unidade_atual_id = NULL,
      sala_id = NULL,
      updated_at = now()
  WHERE id = ANY(p_item_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- BAIXA
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_baixa_itens(
  p_item_ids uuid[],
  p_data timestamptz,
  p_motivo text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_baixados int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  SELECT count(*) INTO v_baixados
  FROM public.estoque_itens
  WHERE id = ANY(p_item_ids) AND status = 'baixa';
  IF v_baixados > 0 THEN
    RAISE EXCEPTION 'Existem itens já baixados na seleção';
  END IF;

  INSERT INTO public.estoque_movimentacoes (
    item_id, tipo, data_movimentacao,
    unidade_origem_id, sala_origem_id,
    responsavel_id, observacao, quantidade_movimentada
  )
  SELECT
    i.id, 'baixa', p_data,
    i.unidade_atual_id, i.sala_id,
    auth.uid(), COALESCE(p_motivo, 'Baixa de equipamento'), 1
  FROM public.estoque_itens i
  WHERE i.id = ANY(p_item_ids);

  UPDATE public.estoque_itens
  SET status = 'baixa',
      unidade_atual_id = NULL,
      sala_id = NULL,
      updated_at = now()
  WHERE id = ANY(p_item_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- RETORNO AO ESTOQUE CENTRAL
-- ============================================================
CREATE OR REPLACE FUNCTION public.retornar_itens_estoque(
  p_item_ids uuid[],
  p_data timestamptz,
  p_observacao text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nenhum item informado';
  END IF;

  INSERT INTO public.estoque_movimentacoes (
    item_id, tipo, data_movimentacao,
    unidade_origem_id, sala_origem_id,
    unidade_destino_id, sala_destino_id,
    responsavel_id, observacao, quantidade_movimentada
  )
  SELECT
    i.id, 'devolucao', p_data,
    i.unidade_atual_id, i.sala_id,
    NULL, NULL,
    auth.uid(), COALESCE(p_observacao, 'Retorno ao estoque central'), 1
  FROM public.estoque_itens i
  WHERE i.id = ANY(p_item_ids);

  UPDATE public.estoque_itens
  SET status = 'disponivel',
      unidade_atual_id = NULL,
      sala_id = NULL,
      updated_at = now()
  WHERE id = ANY(p_item_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Índices úteis para acelerar listagens filtradas
CREATE INDEX IF NOT EXISTS idx_estoque_itens_produto_status ON public.estoque_itens(produto_id, status);
CREATE INDEX IF NOT EXISTS idx_estoque_itens_unidade_status ON public.estoque_itens(unidade_atual_id, status);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_item ON public.estoque_movimentacoes(item_id, data_movimentacao DESC);
