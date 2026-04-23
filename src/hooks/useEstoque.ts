import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Produto,
  EstoqueItemWithRelations,
  EstoqueMovimentacaoWithRelations,
  EstoqueStatus,
  MovimentacaoTipo,
  ProdutoResumo,
  SalaWithUnidade,
} from '@/types/estoque';
import { toast } from 'sonner';

// ==================== HELPER: status para destino (CPD = sempre disponivel) ====================
async function getStatusForDestino(unidadeDestinoId: string | null): Promise<EstoqueStatus> {
  if (!unidadeDestinoId) return 'disponivel';
  const { data } = await supabase
    .from('unidades')
    .select('nome')
    .eq('id', unidadeDestinoId)
    .single();
  const nome = data?.nome?.trim().toUpperCase() || '';
  if (nome === 'CPD' || nome.includes('CPD')) return 'disponivel';
  return 'em_uso';
}

// ==================== PRODUTOS ====================

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as Produto[];
    },
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; categoria?: string }) => {
      const { data: produto, error } = await supabase
        .from('produtos')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar produto'),
  });
}

// ==================== SALAS (lookup geral) ====================

export function useSalas(unidadeId?: string) {
  return useQuery({
    queryKey: ['salas', unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('salas')
        .select('*, unidade:unidades(id, nome)')
        .eq('ativa', true)
        .order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as SalaWithUnidade[];
    },
  });
}

export function useCreateSala() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; unidade_id: string }) => {
      const { data: sala, error } = await supabase
        .from('salas')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return sala;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast.success('Sala cadastrada!');
    },
    onError: () => toast.error('Erro ao cadastrar sala'),
  });
}

// ==================== RESUMO POR PRODUTO ====================
// Cada registro = 1 unidade física

export function useProdutosResumo() {
  return useQuery({
    queryKey: ['produtos-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('produto_id, status, produto:produtos(id, nome, categoria)');
      if (error) throw error;

      const resumoMap = new Map<string, ProdutoResumo>();
      for (const item of data || []) {
        const produtoId = (item as any).produto_id as string;
        const produto = (item as any).produto;
        if (!resumoMap.has(produtoId)) {
          resumoMap.set(produtoId, {
            produto_id: produtoId,
            nome: produto?.nome || 'Produto desconhecido',
            categoria: produto?.categoria || null,
            total: 0,
            disponivel: 0,
            em_uso: 0,
            manutencao: 0,
            baixa: 0,
          });
        }
        const resumo = resumoMap.get(produtoId)!;
        resumo.total += 1;
        switch ((item as any).status as EstoqueStatus) {
          case 'disponivel': resumo.disponivel += 1; break;
          case 'em_uso': resumo.em_uso += 1; break;
          case 'manutencao': resumo.manutencao += 1; break;
          case 'baixa': resumo.baixa += 1; break;
        }
      }
      return Array.from(resumoMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

// ==================== DISTRIBUIÇÃO POR PRODUTO ====================

export function useProdutoDistribuicao(produtoId: string) {
  return useQuery({
    queryKey: ['produto-distribuicao', produtoId],
    queryFn: async () => {
      const { data: itens, error } = await supabase
        .from('estoque_itens')
        .select('id, status, unidade_atual_id, sala_id, unidade_atual:unidades(id, nome), sala:salas(id, nome)')
        .eq('produto_id', produtoId)
        .in('status', ['em_uso', 'manutencao']);
      if (error) throw error;

      const unidadeMap = new Map<string, { unidade_id: string; unidade_nome: string; quantidade: number }>();
      const salaMap = new Map<string, { sala_id: string; sala_nome: string; unidade_id: string; unidade_nome: string; quantidade: number }>();

      for (const item of itens || []) {
        const it: any = item;
        if (!it.unidade_atual_id) continue;
        const unidadeId = it.unidade_atual_id;
        const unidade = it.unidade_atual;
        const sala = it.sala;

        if (!unidadeMap.has(unidadeId)) {
          unidadeMap.set(unidadeId, {
            unidade_id: unidadeId,
            unidade_nome: unidade?.nome || 'Desconhecida',
            quantidade: 0,
          });
        }
        unidadeMap.get(unidadeId)!.quantidade += 1;

        if (sala && it.sala_id) {
          const salaKey = `${unidadeId}-${it.sala_id}`;
          if (!salaMap.has(salaKey)) {
            salaMap.set(salaKey, {
              sala_id: it.sala_id,
              sala_nome: sala.nome,
              unidade_id: unidadeId,
              unidade_nome: unidade?.nome || 'Desconhecida',
              quantidade: 0,
            });
          }
          salaMap.get(salaKey)!.quantidade += 1;
        }
      }

      return {
        porUnidade: Array.from(unidadeMap.values()),
        porSala: Array.from(salaMap.values()),
      };
    },
    enabled: !!produtoId,
  });
}

// ==================== ESTOQUE ITENS ====================

export function useEstoqueItens(options?: {
  status?: EstoqueStatus;
  produtoId?: string;
  unidadeId?: string;
}) {
  return useQuery({
    queryKey: ['estoque-itens', options?.status, options?.produtoId, options?.unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('estoque_itens')
        .select(`
          *,
          produto:produtos(id, nome, categoria),
          unidade_atual:unidades(id, nome),
          sala:salas(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (options?.status) query = query.eq('status', options.status);
      if (options?.produtoId) query = query.eq('produto_id', options.produtoId);
      if (options?.unidadeId) query = query.eq('unidade_atual_id', options.unidadeId);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EstoqueItemWithRelations[];
    },
  });
}

export function useEstoqueItemById(id: string) {
  return useQuery({
    queryKey: ['estoque-item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select(`
          *,
          produto:produtos(id, nome, categoria, descricao),
          unidade_atual:unidades(id, nome),
          sala:salas(id, nome)
        `)
        .eq('id', id)
        .maybeSingle();

      let responsavel_entrada = null;
      if ((data as any)?.responsavel_entrada_id) {
        const { data: respData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .eq('id', (data as any).responsavel_entrada_id)
          .single();
        responsavel_entrada = respData;
      }

      if (error) throw error;
      return data ? ({ ...(data as any), responsavel_entrada } as EstoqueItemWithRelations) : null;
    },
    enabled: !!id,
  });
}

export function useEstoqueItensPorProduto(produtoId: string) {
  return useQuery({
    queryKey: ['estoque-itens-produto', produtoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select(`
          *,
          produto:produtos(id, nome, categoria),
          unidade_atual:unidades(id, nome),
          sala:salas(id, nome)
        `)
        .eq('produto_id', produtoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EstoqueItemWithRelations[];
    },
    enabled: !!produtoId,
  });
}

// ==================== CRIAR ENTRADA: N itens individuais ====================

export function useCreateEstoqueItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      produto_id: string;
      quantidade: number;
      patrimonios?: (string | null)[]; // se preenchido, deve ter length === quantidade
      data_entrada: string;
      observacao_entrada?: string | null;
    }) => {
      const qtd = Math.max(1, data.quantidade);
      const created: { id: string; numero_patrimonio: string | null }[] = [];

      for (let i = 0; i < qtd; i++) {
        const patrimonio = data.patrimonios?.[i]?.trim() || null;
        const { data: item, error } = await supabase
          .from('estoque_itens')
          .insert({
            produto_id: data.produto_id,
            numero_patrimonio: patrimonio,
            data_entrada: data.data_entrada,
            observacao_entrada: data.observacao_entrada || null,
            responsavel_entrada_id: user?.id,
            status: 'disponivel' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .select('id, numero_patrimonio')
          .single();
        if (error) {
          if ((error as any).code === '23505') {
            throw new Error(`Número de patrimônio já cadastrado: ${patrimonio}`);
          }
          throw error;
        }
        created.push(item as any);

        await supabase.from('estoque_movimentacoes').insert({
          item_id: item.id,
          tipo: 'entrada' as MovimentacaoTipo,
          data_movimentacao: data.data_entrada,
          responsavel_id: user?.id,
          observacao: data.observacao_entrada || 'Entrada no estoque central',
          quantidade_movimentada: 1,
        });
      }

      return created;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
    },
    onError: (error: any) => {
      console.error('Error creating estoque items:', error);
      toast.error(error.message || 'Erro ao registrar entrada');
      throw error;
    },
  });
}

// ==================== HELPER: selecionar N itens disponíveis ====================
async function pickItems(opts: {
  produtoId?: string;
  status: EstoqueStatus;
  unidadeId?: string | null;
  salaId?: string | null;
  itemIds?: string[];
  quantidade?: number;
}): Promise<string[]> {
  if (opts.itemIds && opts.itemIds.length > 0) return opts.itemIds;
  const qtd = Math.max(1, opts.quantidade || 1);

  let query = supabase
    .from('estoque_itens')
    .select('id')
    .eq('status', opts.status)
    .order('created_at', { ascending: true })
    .limit(qtd);

  if (opts.produtoId) query = query.eq('produto_id', opts.produtoId);
  if (opts.unidadeId === null) query = query.is('unidade_atual_id', null);
  else if (opts.unidadeId) query = query.eq('unidade_atual_id', opts.unidadeId);
  if (opts.salaId) query = query.eq('sala_id', opts.salaId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length < qtd) {
    throw new Error(`Apenas ${data?.length || 0} item(ns) disponível(eis) para esta operação`);
  }
  return data.map(d => d.id);
}

// ==================== SAÍDA PARA UNIDADE ====================

export function useRegistrarSaida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      produtoId,
      itemIds,
      quantidade,
      unidadeDestinoId,
      salaDestinoId,
      dataSaida,
      observacao,
    }: {
      produtoId?: string;
      itemIds?: string[];
      quantidade?: number;
      unidadeDestinoId: string;
      salaDestinoId?: string;
      dataSaida: string;
      observacao?: string;
    }) => {
      const ids = await pickItems({
        produtoId,
        status: 'disponivel',
        unidadeId: null,
        itemIds,
        quantidade,
      });

      const statusDestino = await getStatusForDestino(unidadeDestinoId);

      for (const id of ids) {
        const { data: itemAtual } = await supabase
          .from('estoque_itens')
          .select('unidade_atual_id, sala_id')
          .eq('id', id)
          .single();

        const { error: updErr } = await supabase
          .from('estoque_itens')
          .update({
            status: statusDestino,
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', id);
        if (updErr) throw updErr;

        await supabase.from('estoque_movimentacoes').insert({
          item_id: id,
          tipo: 'saida' as MovimentacaoTipo,
          data_movimentacao: dataSaida,
          unidade_origem_id: itemAtual?.unidade_atual_id || null,
          sala_origem_id: itemAtual?.sala_id || null,
          unidade_destino_id: unidadeDestinoId,
          sala_destino_id: salaDestinoId || null,
          responsavel_id: user?.id,
          observacao: observacao || 'Saída para unidade',
          quantidade_movimentada: 1,
        });
      }

      return ids.length;
    },
    onSuccess: (count) => {
      invalidateEstoqueQueries(queryClient);
      toast.success(`${count} item(ns) enviado(s) com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Error registering saida:', error);
      toast.error(error.message || 'Erro ao registrar saída');
    },
  });
}

// ==================== TRANSFERÊNCIA ====================

export function useRegistrarTransferencia() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      produtoId,
      itemIds,
      quantidade,
      unidadeOrigemId,
      salaOrigemId,
      unidadeDestinoId,
      salaDestinoId,
      dataTransferencia,
      observacao,
    }: {
      produtoId?: string;
      itemIds?: string[];
      quantidade?: number;
      unidadeOrigemId: string;
      salaOrigemId?: string;
      unidadeDestinoId: string;
      salaDestinoId?: string;
      dataTransferencia: string;
      observacao?: string;
    }) => {
      const ids = await pickItems({
        produtoId,
        status: 'em_uso',
        unidadeId: unidadeOrigemId,
        salaId: salaOrigemId || undefined,
        itemIds,
        quantidade,
      });

      const statusDestino = await getStatusForDestino(unidadeDestinoId);

      for (const id of ids) {
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: statusDestino,
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', id);
        if (error) throw error;

        await supabase.from('estoque_movimentacoes').insert({
          item_id: id,
          tipo: 'transferencia' as MovimentacaoTipo,
          data_movimentacao: dataTransferencia,
          unidade_origem_id: unidadeOrigemId,
          sala_origem_id: salaOrigemId || null,
          unidade_destino_id: unidadeDestinoId,
          sala_destino_id: salaDestinoId || null,
          responsavel_id: user?.id,
          observacao: observacao || 'Transferência entre unidades',
          quantidade_movimentada: 1,
        });
      }

      return ids.length;
    },
    onSuccess: (count) => {
      invalidateEstoqueQueries(queryClient);
      toast.success(`${count} item(ns) transferido(s) com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Error registering transferencia:', error);
      toast.error(error.message || 'Erro ao registrar transferência');
    },
  });
}

// ==================== RETORNO AO ESTOQUE CENTRAL ====================

export function useRegistrarRetorno() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemIds,
      dataRetorno,
      observacao,
    }: {
      itemIds: string[];
      dataRetorno: string;
      observacao?: string;
    }) => {
      for (const id of itemIds) {
        const { data: itemAtual } = await supabase
          .from('estoque_itens')
          .select('unidade_atual_id, sala_id')
          .eq('id', id)
          .single();

        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'disponivel' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', id);
        if (error) throw error;

        await supabase.from('estoque_movimentacoes').insert({
          item_id: id,
          tipo: 'devolucao' as MovimentacaoTipo,
          data_movimentacao: dataRetorno,
          unidade_origem_id: itemAtual?.unidade_atual_id || null,
          sala_origem_id: itemAtual?.sala_id || null,
          unidade_destino_id: null,
          responsavel_id: user?.id,
          observacao: observacao || 'Retorno ao estoque central',
          quantidade_movimentada: 1,
        });
      }
      return itemIds.length;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Retorno registrado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar retorno');
    },
  });
}

// ==================== MANUTENÇÃO ====================

export function useRegistrarManutencao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemIds,
      produtoId,
      quantidade,
      dataManutencao,
      observacao,
    }: {
      itemIds?: string[];
      produtoId?: string;
      quantidade?: number;
      dataManutencao: string;
      observacao?: string;
    }) => {
      let ids = itemIds || [];
      if (ids.length === 0) {
        // pick from em_uso OR disponivel (any unit)
        const qtd = Math.max(1, quantidade || 1);
        let query = supabase
          .from('estoque_itens')
          .select('id')
          .in('status', ['em_uso', 'disponivel'])
          .order('created_at', { ascending: true })
          .limit(qtd);
        if (produtoId) query = query.eq('produto_id', produtoId);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length < qtd) {
          throw new Error(`Apenas ${data?.length || 0} item(ns) disponível(eis) para manutenção`);
        }
        ids = data.map(d => d.id);
      }

      for (const id of ids) {
        const { data: itemAtual } = await supabase
          .from('estoque_itens')
          .select('unidade_atual_id, sala_id')
          .eq('id', id)
          .single();

        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'manutencao' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', id);
        if (error) throw error;

        await supabase.from('estoque_movimentacoes').insert({
          item_id: id,
          tipo: 'manutencao' as MovimentacaoTipo,
          data_movimentacao: dataManutencao,
          unidade_origem_id: itemAtual?.unidade_atual_id || null,
          sala_origem_id: itemAtual?.sala_id || null,
          responsavel_id: user?.id,
          observacao: observacao || 'Equipamento em manutenção',
          quantidade_movimentada: 1,
        });
      }
      return ids.length;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Manutenção registrada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar manutenção');
    },
  });
}

export function useRetornarManutencao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      dataRetorno,
      observacao,
      destino,
      unidadeDestinoId,
      salaDestinoId,
    }: {
      itemId: string;
      dataRetorno: string;
      observacao?: string;
      destino: 'estoque_central' | 'unidade';
      unidadeDestinoId?: string;
      salaDestinoId?: string;
    }) => {
      if (destino === 'estoque_central') {
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'disponivel' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', itemId);
        if (error) throw error;
      } else {
        if (!unidadeDestinoId) throw new Error('Informe a unidade de destino');
        const statusDestino = await getStatusForDestino(unidadeDestinoId);
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: statusDestino,
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', itemId);
        if (error) throw error;
      }

      await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'retorno_manutencao' as MovimentacaoTipo,
        data_movimentacao: dataRetorno,
        unidade_destino_id: destino === 'unidade' ? unidadeDestinoId : null,
        sala_destino_id: destino === 'unidade' ? (salaDestinoId || null) : null,
        responsavel_id: user?.id,
        observacao: observacao || 'Retorno da manutenção',
        quantidade_movimentada: 1,
      });

      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Retorno de manutenção registrado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar retorno');
    },
  });
}

// ==================== MOVIMENTAÇÕES (histórico) ====================

export function useEstoqueMovimentacoes(itemId?: string) {
  return useQuery({
    queryKey: ['estoque-movimentacoes', itemId],
    queryFn: async () => {
      let query = supabase
        .from('estoque_movimentacoes')
        .select(`
          *,
          unidade_origem:unidades!estoque_movimentacoes_unidade_origem_id_fkey(id, nome),
          unidade_destino:unidades!estoque_movimentacoes_unidade_destino_id_fkey(id, nome),
          sala_origem:salas!estoque_movimentacoes_sala_origem_id_fkey(id, nome),
          sala_destino:salas!estoque_movimentacoes_sala_destino_id_fkey(id, nome)
        `)
        .order('data_movimentacao', { ascending: false });
      if (itemId) query = query.eq('item_id', itemId);

      const { data, error } = await query;
      if (error) throw error;

      const movimentacoesComResponsavel = await Promise.all(
        (data || []).map(async (mov: any) => {
          let responsavel = null;
          if (mov.responsavel_id) {
            const { data: respData } = await supabase
              .from('profiles')
              .select('id, nome, email')
              .eq('id', mov.responsavel_id)
              .single();
            responsavel = respData;
          }
          return { ...mov, responsavel } as EstoqueMovimentacaoWithRelations;
        })
      );
      return movimentacoesComResponsavel;
    },
    enabled: itemId ? !!itemId : true,
  });
}

export function useEstoqueMovimentacoesPorProduto(produtoId: string) {
  return useQuery({
    queryKey: ['estoque-movimentacoes-produto', produtoId],
    queryFn: async () => {
      const { data: itens } = await supabase
        .from('estoque_itens')
        .select('id')
        .eq('produto_id', produtoId);

      const itemIds = (itens || []).map(i => i.id);
      if (itemIds.length === 0) return [];

      const { data, error } = await supabase
        .from('estoque_movimentacoes')
        .select(`
          *,
          unidade_origem:unidades!estoque_movimentacoes_unidade_origem_id_fkey(id, nome),
          unidade_destino:unidades!estoque_movimentacoes_unidade_destino_id_fkey(id, nome),
          sala_origem:salas!estoque_movimentacoes_sala_origem_id_fkey(id, nome),
          sala_destino:salas!estoque_movimentacoes_sala_destino_id_fkey(id, nome)
        `)
        .in('item_id', itemIds)
        .order('data_movimentacao', { ascending: false })
        .limit(50);
      if (error) throw error;

      const movimentacoesComResponsavel = await Promise.all(
        (data || []).map(async (mov: any) => {
          let responsavel = null;
          if (mov.responsavel_id) {
            const { data: respData } = await supabase
              .from('profiles')
              .select('id, nome, email')
              .eq('id', mov.responsavel_id)
              .single();
            responsavel = respData;
          }
          return { ...mov, responsavel } as EstoqueMovimentacaoWithRelations;
        })
      );
      return movimentacoesComResponsavel;
    },
    enabled: !!produtoId,
  });
}

// ==================== ESTATÍSTICAS ====================

export function useEstoqueStats() {
  return useQuery({
    queryKey: ['estoque-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('status');
      if (error) throw error;

      const stats = {
        total: data.length,
        disponivel: data.filter((i: any) => i.status === 'disponivel').length,
        em_uso: data.filter((i: any) => i.status === 'em_uso').length,
        manutencao: data.filter((i: any) => i.status === 'manutencao').length,
        baixa: data.filter((i: any) => i.status === 'baixa').length,
      };
      return stats;
    },
  });
}

// ==================== PATRIMÔNIO ====================

export function useVerificarPatrimonio() {
  return useMutation({
    mutationFn: async (patrimonio: string) => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('id, numero_patrimonio')
        .eq('numero_patrimonio', patrimonio)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Atualiza patrimônio de um item individual
export function useAtualizarPatrimonio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, numero_patrimonio }: { itemId: string; numero_patrimonio: string | null }) => {
      const { error } = await supabase
        .from('estoque_itens')
        .update({ numero_patrimonio: numero_patrimonio?.trim() || null })
        .eq('id', itemId);
      if (error) {
        if ((error as any).code === '23505') throw new Error('Patrimônio já cadastrado');
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Patrimônio atualizado!');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar patrimônio'),
  });
}

// ==================== BAIXA ====================

export function useRegistrarBaixa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemIds,
      produtoId,
      quantidade,
      dataBaixa,
      motivo,
    }: {
      itemIds?: string[];
      produtoId?: string;
      quantidade?: number;
      dataBaixa: string;
      motivo?: string;
    }) => {
      let ids = itemIds || [];
      if (ids.length === 0) {
        const qtd = Math.max(1, quantidade || 1);
        let query = supabase
          .from('estoque_itens')
          .select('id')
          .in('status', ['disponivel', 'em_uso'])
          .order('created_at', { ascending: true })
          .limit(qtd);
        if (produtoId) query = query.eq('produto_id', produtoId);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length < qtd) {
          throw new Error(`Apenas ${data?.length || 0} item(ns) disponível(eis) para baixa`);
        }
        ids = data.map(d => d.id);
      }

      for (const id of ids) {
        const { data: itemAtual } = await supabase
          .from('estoque_itens')
          .select('status, unidade_atual_id, sala_id')
          .eq('id', id)
          .single();

        if (itemAtual?.status === 'baixa') {
          throw new Error('Item já foi baixado');
        }

        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'baixa' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', id);
        if (error) throw error;

        await supabase.from('estoque_movimentacoes').insert({
          item_id: id,
          tipo: 'baixa' as MovimentacaoTipo,
          data_movimentacao: dataBaixa,
          unidade_origem_id: itemAtual?.unidade_atual_id || null,
          sala_origem_id: itemAtual?.sala_id || null,
          unidade_destino_id: null,
          responsavel_id: user?.id,
          observacao: motivo || 'Baixa de equipamento',
          quantidade_movimentada: 1,
        });
      }
      return ids.length;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Baixa registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error registering baixa:', error);
      toast.error(error.message || 'Erro ao registrar baixa');
    },
  });
}

// ==================== HELPERS ====================

function invalidateEstoqueQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
  queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
  queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] });
  queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
  queryClient.invalidateQueries({ queryKey: ['produtos-resumo'] });
  queryClient.invalidateQueries({ queryKey: ['produto-distribuicao'] });
  queryClient.invalidateQueries({ queryKey: ['estoque-itens-produto'] });
  queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes-produto'] });
}
