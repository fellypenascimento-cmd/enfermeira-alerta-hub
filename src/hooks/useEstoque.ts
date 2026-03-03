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
      const { data: itemAtual } = await supabase
        .from('estoque_itens')
        .select('unidade_atual_id, controle_patrimonial, quantidade_total')
        .eq('id', itemId)
        .single();

      if (!itemAtual) throw new Error('Item não encontrado');

      const qtdSaida = itemAtual.controle_patrimonial ? 1 : (quantidadeSaida || 1);

      if (!itemAtual.controle_patrimonial) {
        if (qtdSaida > (itemAtual.quantidade_total || 0)) {
          throw new Error('Quantidade de saída excede o disponível');
        }
      }

      if (itemAtual.controle_patrimonial) {
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

      // Sync estoque_lotacoes: upsert destination lotação
      if (!itemAtual.controle_patrimonial) {
        const { data: lotDest } = await supabase
          .from('estoque_lotacoes')
          .select('id, quantidade')
          .eq('item_id', itemId)
          .eq('unidade_id', unidadeDestinoId)
          .maybeSingle();

        if (lotDest) {
          await supabase.from('estoque_lotacoes').update({
            quantidade: lotDest.quantidade + qtdSaida,
            ...(localEspecifico ? { local_especifico: localEspecifico } : {}),
          }).eq('id', lotDest.id);
        } else {
          await supabase.from('estoque_lotacoes').insert({
            item_id: itemId,
            unidade_id: unidadeDestinoId,
            quantidade: qtdSaida,
            local_especifico: localEspecifico || null,
          });
        }
      }

      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'saida' as MovimentacaoTipo,
        data_movimentacao: dataSaida,
        unidade_origem_id: itemAtual?.unidade_atual_id || null,
        unidade_destino_id: unidadeDestinoId,
        responsavel_id: user?.id,
        observacao: observacao || 'Saída para unidade',
        local_especifico: localEspecifico || null,
        quantidade_movimentada: qtdSaida,
      });

      if (movError) throw movError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-lotacoes'] });
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

      for (const pat of patrimonios) {
        const { data: newItem, error } = await supabase.from('estoque_itens').insert({
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
        }).select().single();

        if (error) {
          if (error.code === '23505') {
            throw new Error(`Patrimônio "${pat}" já existe no sistema`);
          }
          throw error;
        }

        // Register patrimonializacao movement for the new item
        if (newItem) {
          await supabase.from('estoque_movimentacoes').insert({
            item_id: newItem.id,
            tipo: 'patrimonializacao' as MovimentacaoTipo,
            data_movimentacao: new Date().toISOString(),
            responsavel_id: user?.id,
            observacao: `Patrimonializado a partir do lote (item ${itemId}). Patrimônio: ${pat}`,
            unidade_destino_id: itemOriginal.unidade_atual_id,
            local_especifico: itemOriginal.local_especifico,
          });
        }
      }

      const novaQtd = (itemOriginal.quantidade_total || 0) - patrimonios.length;
      if (novaQtd <= 0) {
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

      // Register movement on original item
      await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'patrimonializacao' as MovimentacaoTipo,
        data_movimentacao: new Date().toISOString(),
        responsavel_id: user?.id,
        observacao: `${patrimonios.length} unidade(s) convertida(s) em patrimonial: ${patrimonios.join(', ')}`,
      });

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
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            status: 'baixa' as EstoqueStatus,
            unidade_atual_id: null,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      } else {
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

// ==================== LOTAÇÕES POR UNIDADE ====================

export function useEstoqueLotacoes(itemId?: string) {
  return useQuery({
    queryKey: ['estoque-lotacoes', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_lotacoes')
        .select(`
          *,
          unidade:unidades(id, nome)
        `)
        .eq('item_id', itemId!)
        .gt('quantidade', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Array<{
        id: string;
        item_id: string;
        unidade_id: string;
        quantidade: number;
        local_especifico: string | null;
        unidade: { id: string; nome: string } | null;
      }>;
    },
    enabled: !!itemId,
  });
}

// ==================== LIBERAÇÃO / TRANSFERÊNCIA ====================

export function useRegistrarLiberacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      unidadeOrigemId,
      destino,
      unidadeDestinoId,
      localEspecifico,
      quantidade,
      dataMovimentacao,
      observacao,
    }: {
      itemId: string;
      unidadeOrigemId: string;
      destino: 'estoque_geral' | 'transferir';
      unidadeDestinoId?: string;
      localEspecifico?: string;
      quantidade?: number;
      dataMovimentacao: string;
      observacao?: string;
    }) => {
      // Fetch the lotação for the specific origin unit
      const { data: lotacao, error: lotError } = await supabase
        .from('estoque_lotacoes')
        .select('id, quantidade, local_especifico')
        .eq('item_id', itemId)
        .eq('unidade_id', unidadeOrigemId)
        .gt('quantidade', 0)
        .single();

      if (lotError || !lotacao) throw new Error('Lotação não encontrada para esta unidade.');

      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('status, controle_patrimonial, quantidade_total')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      if (itemAtual?.status === 'baixa') {
        throw new Error('Não é possível liberar um equipamento com status de baixa.');
      }

      if (destino === 'transferir' && !unidadeDestinoId) {
        throw new Error('Selecione a unidade de destino para transferência.');
      }

      const qtdLiberar = quantidade || (itemAtual?.controle_patrimonial ? 1 : lotacao.quantidade);

      if (qtdLiberar <= 0) throw new Error('Quantidade deve ser maior que zero.');
      if (qtdLiberar > lotacao.quantidade) {
        throw new Error(`Quantidade a liberar (${qtdLiberar}) excede a lotada nesta unidade (${lotacao.quantidade}).`);
      }

      // 1. Update lotação at origin
      const novaQtdLotacao = lotacao.quantidade - qtdLiberar;
      if (novaQtdLotacao <= 0) {
        await supabase.from('estoque_lotacoes').delete().eq('id', lotacao.id);
      } else {
        await supabase.from('estoque_lotacoes').update({ quantidade: novaQtdLotacao }).eq('id', lotacao.id);
      }

      // 2. Handle destination
      if (destino === 'transferir' && unidadeDestinoId) {
        // Upsert lotação at destination
        const { data: lotDest } = await supabase
          .from('estoque_lotacoes')
          .select('id, quantidade')
          .eq('item_id', itemId)
          .eq('unidade_id', unidadeDestinoId)
          .maybeSingle();

        if (lotDest) {
          await supabase.from('estoque_lotacoes').update({
            quantidade: lotDest.quantidade + qtdLiberar,
            ...(localEspecifico ? { local_especifico: localEspecifico } : {}),
          }).eq('id', lotDest.id);
        } else {
          await supabase.from('estoque_lotacoes').insert({
            item_id: itemId,
            unidade_id: unidadeDestinoId,
            quantidade: qtdLiberar,
            local_especifico: localEspecifico || null,
          });
        }
      }
      // If estoque_geral, quantity goes back to general stock (no lotação record needed)

      // 3. Recalculate totals from remaining lotações
      const { data: allLotacoes } = await supabase
        .from('estoque_lotacoes')
        .select('quantidade')
        .eq('item_id', itemId)
        .gt('quantidade', 0);

      const totalLotado = (allLotacoes || []).reduce((sum, l) => sum + l.quantidade, 0);

      // Update estoque_itens status based on remaining lotações
      if (totalLotado === 0) {
        await supabase.from('estoque_itens').update({
          unidade_atual_id: null,
          local_especifico: null,
          status: 'disponivel',
        }).eq('id', itemId);
      }

      // 4. Record movement
      const tipo: MovimentacaoTipo = destino === 'transferir' ? 'transferencia' : 'liberacao';
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo,
        data_movimentacao: dataMovimentacao,
        unidade_origem_id: unidadeOrigemId,
        unidade_destino_id: destino === 'transferir' ? unidadeDestinoId! : null,
        responsavel_id: user?.id,
        observacao: observacao || (destino === 'transferir' ? 'Transferência entre unidades' : 'Equipamento liberado da unidade'),
        local_especifico: localEspecifico || null,
        quantidade_movimentada: qtdLiberar,
      });

      if (movError) throw movError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-itens'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-item'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-lotacoes'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-stats'] });
      toast.success('Movimentação registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error releasing/transferring item:', error);
      toast.error(error.message || 'Erro ao processar movimentação');
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
