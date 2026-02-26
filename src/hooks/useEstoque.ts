import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Produto, 
  EstoqueItemWithRelations, 
  EstoqueMovimentacaoWithRelations,
  EstoqueStatus,
  MovimentacaoTipo 
} from '@/types/estoque';
import { toast } from 'sonner';

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
    onError: (error) => {
      console.error('Error creating produto:', error);
      toast.error('Erro ao cadastrar produto');
    },
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
          unidade_atual:unidades(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.produtoId) {
        query = query.eq('produto_id', options.produtoId);
      }
      if (options?.unidadeId) {
        query = query.eq('unidade_atual_id', options.unidadeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EstoqueItemWithRelations[];
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
          unidade_atual:unidades(id, nome)
        `)
        .eq('id', id)
        .maybeSingle();
      
      // Buscar responsável separadamente
      let responsavel_entrada = null;
      if (data?.responsavel_entrada_id) {
        const { data: respData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .eq('id', data.responsavel_entrada_id)
          .single();
        responsavel_entrada = respData;
      }

      if (error) throw error;
      return data ? { ...data, responsavel_entrada } as EstoqueItemWithRelations : null;
    },
    enabled: !!id,
  });
}

export function useCreateEstoqueItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      produto_id: string;
      numero_patrimonio?: string | null;
      quantidade?: number;
      controle_patrimonial?: boolean;
      quantidade_total?: number;
      data_entrada: string;
      observacao_entrada?: string | null;
    }) => {
      const { data: item, error } = await supabase
        .from('estoque_itens')
        .insert({
          produto_id: data.produto_id,
          numero_patrimonio: data.numero_patrimonio || null,
          quantidade: data.quantidade ?? 1,
          controle_patrimonial: data.controle_patrimonial ?? false,
          quantidade_total: data.quantidade_total ?? 1,
          data_entrada: data.data_entrada,
          observacao_entrada: data.observacao_entrada || null,
          responsavel_entrada_id: user?.id,
          status: 'disponivel' as EstoqueStatus,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar movimentação de entrada
      await supabase.from('estoque_movimentacoes').insert({
        item_id: item.id,
        tipo: 'entrada' as MovimentacaoTipo,
        data_movimentacao: data.data_entrada,
        responsavel_id: user?.id,
        observacao: data.observacao_entrada || 'Entrada no estoque',
      });

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
    },
    onError: (error: any) => {
      console.error('Error creating estoque item:', error);
      if (error.code === '23505') {
        toast.error('Número de patrimônio já cadastrado!');
      } else {
        toast.error('Erro ao registrar entrada');
      }
      throw error;
    },
  });
}

export function useRegistrarSaida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      unidadeDestinoId,
      dataSaida,
      observacao,
      localEspecifico,
      quantidadeSaida,
    }: {
      itemId: string;
      unidadeDestinoId: string;
      dataSaida: string;
      observacao?: string;
      localEspecifico?: string;
      quantidadeSaida?: number;
    }) => {
      // Buscar item atual
      const { data: itemAtual } = await supabase
        .from('estoque_itens')
        .select('unidade_atual_id, controle_patrimonial, quantidade_total')
        .eq('id', itemId)
        .single();

      if (!itemAtual) throw new Error('Item não encontrado');

      if (itemAtual.controle_patrimonial) {
        // Item com patrimônio: comportamento atual
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            status: 'em_uso' as EstoqueStatus,
            unidade_atual_id: unidadeDestinoId,
            local_especifico: localEspecifico || null,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      } else {
        // Item sem patrimônio: subtrair quantidade
        const qtdSaida = quantidadeSaida || 1;
        if (qtdSaida > (itemAtual.quantidade_total || 0)) {
          throw new Error('Quantidade de saída excede o disponível');
        }

        const novaQtd = (itemAtual.quantidade_total || 0) - qtdSaida;
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            quantidade_total: novaQtd,
            quantidade: novaQtd,
            status: novaQtd === 0 ? ('em_uso' as EstoqueStatus) : ('disponivel' as EstoqueStatus),
            unidade_atual_id: unidadeDestinoId,
            local_especifico: localEspecifico || null,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      }

      // Registrar movimentação
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'saida' as MovimentacaoTipo,
        data_movimentacao: dataSaida,
        unidade_origem_id: itemAtual?.unidade_atual_id || null,
        unidade_destino_id: unidadeDestinoId,
        responsavel_id: user?.id,
        observacao: observacao || 'Saída para unidade',
        local_especifico: localEspecifico || null,
      });

      if (movError) throw movError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
      toast.success('Saída registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error registering saida:', error);
      toast.error(error.message || 'Erro ao registrar saída');
    },
  });
}

// ==================== CONVERTER PARA PATRIMONIAL ====================

export function useConverterParaPatrimonial() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      patrimonios,
    }: {
      itemId: string;
      patrimonios: string[];
    }) => {
      // Buscar item original
      const { data: itemOriginal, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemOriginal) throw new Error('Item não encontrado');
      if (itemOriginal.controle_patrimonial) throw new Error('Item já é patrimonial');
      if (patrimonios.length > (itemOriginal.quantidade_total || 0)) {
        throw new Error('Quantidade de patrimônios excede a quantidade disponível');
      }

      // Criar registros individuais
      for (const pat of patrimonios) {
        const { error } = await supabase.from('estoque_itens').insert({
          produto_id: itemOriginal.produto_id,
          numero_patrimonio: pat,
          quantidade: 1,
          controle_patrimonial: true,
          quantidade_total: 1,
          status: itemOriginal.status,
          unidade_atual_id: itemOriginal.unidade_atual_id,
          local_especifico: itemOriginal.local_especifico,
          data_entrada: itemOriginal.data_entrada,
          responsavel_entrada_id: user?.id,
          observacao_entrada: `Convertido de lote (item ${itemId})`,
        });
        if (error) {
          if (error.code === '23505') {
            throw new Error(`Patrimônio "${pat}" já existe no sistema`);
          }
          throw error;
        }
      }

      // Subtrair do original
      const novaQtd = (itemOriginal.quantidade_total || 0) - patrimonios.length;
      if (novaQtd <= 0) {
        // Remover item original (marcar como baixa com quantidade 0)
        await supabase
          .from('estoque_itens')
          .update({ quantidade_total: 0, quantidade: 0, status: 'baixa' })
          .eq('id', itemId);
      } else {
        await supabase
          .from('estoque_itens')
          .update({ quantidade_total: novaQtd, quantidade: novaQtd })
          .eq('id', itemId);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
      toast.success('Patrimônios adicionados com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error converting to patrimonial:', error);
      toast.error(error.message || 'Erro ao adicionar patrimônios');
    },
  });
}

// ==================== MOVIMENTAÇÕES ====================

export function useEstoqueMovimentacoes(itemId?: string) {
  return useQuery({
    queryKey: ['estoque-movimentacoes', itemId],
    queryFn: async () => {
      let query = supabase
        .from('estoque_movimentacoes')
        .select(`
          *,
          unidade_origem:unidades!estoque_movimentacoes_unidade_origem_id_fkey(id, nome),
          unidade_destino:unidades!estoque_movimentacoes_unidade_destino_id_fkey(id, nome)
        `)
        .order('data_movimentacao', { ascending: false });

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Buscar responsáveis separadamente
      const movimentacoesComResponsavel = await Promise.all(
        (data || []).map(async (mov) => {
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

// ==================== ESTATÍSTICAS ====================

export function useEstoqueStats() {
  return useQuery({
    queryKey: ['estoque-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('status, quantidade, quantidade_total, controle_patrimonial');

      if (error) throw error;

      const stats = {
        total: data.reduce((acc, item) => acc + (item.controle_patrimonial ? 1 : (item.quantidade_total || 1)), 0),
        totalQuantidade: data.reduce((acc, item) => acc + (item.quantidade_total || 1), 0),
        disponivel: data.filter((i) => i.status === 'disponivel').reduce((acc, item) => acc + (item.controle_patrimonial ? 1 : (item.quantidade_total || 1)), 0),
        em_uso: data.filter((i) => i.status === 'em_uso').reduce((acc, item) => acc + (item.controle_patrimonial ? 1 : (item.quantidade_total || 1)), 0),
        baixa: data.filter((i) => i.status === 'baixa').reduce((acc, item) => acc + (item.controle_patrimonial ? 1 : (item.quantidade_total || 1)), 0),
      };

      return stats;
    },
  });
}

// ==================== BUSCA POR PATRIMÔNIO ====================

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

// ==================== BAIXA DE EQUIPAMENTO ====================

export function useRegistrarBaixa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      dataBaixa,
      motivo,
      quantidadeBaixa,
    }: {
      itemId: string;
      dataBaixa: string;
      motivo?: string;
      quantidadeBaixa?: number;
    }) => {
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('unidade_atual_id, status, controle_patrimonial, quantidade_total')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      if (itemAtual?.status === 'baixa') {
        throw new Error('Este equipamento já foi baixado.');
      }

      if (itemAtual?.controle_patrimonial) {
        // Patrimonial: baixa individual (comportamento atual)
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            status: 'baixa' as EstoqueStatus,
            unidade_atual_id: null,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      } else {
        // Não patrimonial: baixa por quantidade
        const qtdBaixa = quantidadeBaixa || (itemAtual?.quantidade_total || 1);
        if (qtdBaixa > (itemAtual?.quantidade_total || 0)) {
          throw new Error('Quantidade de baixa excede o disponível');
        }
        const novaQtd = (itemAtual?.quantidade_total || 0) - qtdBaixa;
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            quantidade_total: novaQtd,
            quantidade: novaQtd,
            status: novaQtd === 0 ? ('baixa' as EstoqueStatus) : ('disponivel' as EstoqueStatus),
            unidade_atual_id: novaQtd === 0 ? null : itemAtual?.unidade_atual_id,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      }

      // Registrar movimentação
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'baixa' as MovimentacaoTipo,
        data_movimentacao: dataBaixa,
        unidade_origem_id: itemAtual?.unidade_atual_id || null,
        unidade_destino_id: null,
        responsavel_id: user?.id,
        observacao: motivo || 'Baixa de equipamento',
      });

      if (movError) throw movError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
      toast.success('Baixa registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error registering baixa:', error);
      toast.error(error.message || 'Erro ao registrar baixa');
    },
  });
}

// ==================== BUSCA ITENS PARA BAIXA ====================

export function useEstoqueItensParaBaixa(searchTerm?: string) {
  return useQuery({
    queryKey: ['estoque-itens-para-baixa', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('estoque_itens')
        .select(`
          *,
          produto:produtos(id, nome, categoria),
          unidade_atual:unidades(id, nome)
        `)
        .in('status', ['disponivel', 'em_uso'])
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data as EstoqueItemWithRelations[];
      
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filteredData = filteredData.filter((item) => {
          const matchPatrimonio = item.numero_patrimonio?.toLowerCase().includes(term);
          const matchProduto = item.produto?.nome?.toLowerCase().includes(term);
          return matchPatrimonio || matchProduto;
        });
      }

      return filteredData;
    },
  });
}
