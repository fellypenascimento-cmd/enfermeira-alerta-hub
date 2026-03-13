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
  Sala,
  SalaWithUnidade,
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

// ==================== SALAS ====================

export function useSalas(unidadeId?: string) {
  return useQuery({
    queryKey: ['salas', unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('salas')
        .select('*, unidade:unidades(id, nome)')
        .eq('ativa', true)
        .order('nome');

      if (unidadeId) {
        query = query.eq('unidade_id', unidadeId);
      }

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
    onError: (error) => {
      console.error('Error creating sala:', error);
      toast.error('Erro ao cadastrar sala');
    },
  });
}

// ==================== PRODUTOS RESUMO (TELA PRINCIPAL) ====================

export function useProdutosResumo() {
  return useQuery({
    queryKey: ['produtos-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select('produto_id, status, quantidade_total, controle_patrimonial, produto:produtos(id, nome, categoria)');

      if (error) throw error;

      const resumoMap = new Map<string, ProdutoResumo>();

      for (const item of data || []) {
        const produtoId = item.produto_id;
        const produto = item.produto as any;
        
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
        const qty = item.controle_patrimonial ? 1 : (item.quantidade_total || 0);
        
        resumo.total += qty;
        
        switch (item.status) {
          case 'disponivel':
            resumo.disponivel += qty;
            break;
          case 'em_uso':
            resumo.em_uso += qty;
            break;
          case 'manutencao':
            resumo.manutencao += qty;
            break;
          case 'baixa':
            resumo.baixa += qty;
            break;
        }
      }

      return Array.from(resumoMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

// ==================== DISTRIBUIÇÃO POR PRODUTO ====================
// Lê diretamente de estoque_itens (estado atual), NÃO de lotacoes ou histórico

export function useProdutoDistribuicao(produtoId: string) {
  return useQuery({
    queryKey: ['produto-distribuicao', produtoId],
    queryFn: async () => {
      const { data: itens, error } = await supabase
        .from('estoque_itens')
        .select('id, quantidade_total, controle_patrimonial, status, unidade_atual_id, sala_id, unidade_atual:unidades(id, nome), sala:salas(id, nome)')
        .eq('produto_id', produtoId)
        .in('status', ['em_uso', 'manutencao']); // Somente itens alocados

      if (error) throw error;

      // Aggregate by unidade
      const unidadeMap = new Map<string, { unidade_id: string; unidade_nome: string; quantidade: number }>();
      const salaMap = new Map<string, { sala_id: string; sala_nome: string; unidade_id: string; unidade_nome: string; quantidade: number }>();

      for (const item of itens || []) {
        if (!item.unidade_atual_id) continue;
        
        const unidade = item.unidade_atual as any;
        const sala = item.sala as any;
        const qty = item.controle_patrimonial ? 1 : (item.quantidade_total || 0);
        const unidadeId = item.unidade_atual_id;

        // By unidade
        if (!unidadeMap.has(unidadeId)) {
          unidadeMap.set(unidadeId, {
            unidade_id: unidadeId,
            unidade_nome: unidade?.nome || 'Desconhecida',
            quantidade: 0,
          });
        }
        unidadeMap.get(unidadeId)!.quantidade += qty;

        // By sala
        if (sala && item.sala_id) {
          const salaKey = `${unidadeId}-${item.sala_id}`;
          if (!salaMap.has(salaKey)) {
            salaMap.set(salaKey, {
              sala_id: item.sala_id,
              sala_nome: sala.nome,
              unidade_id: unidadeId,
              unidade_nome: unidade?.nome || 'Desconhecida',
              quantidade: 0,
            });
          }
          salaMap.get(salaKey)!.quantidade += qty;
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
          unidade_atual:unidades(id, nome),
          sala:salas(id, nome)
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

// ==================== ITENS POR PRODUTO (para detalhe do produto) ====================

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
      return data as EstoqueItemWithRelations[];
    },
    enabled: !!produtoId,
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
          // Entrada sempre vai para Estoque Central (sem unidade/sala)
          unidade_atual_id: null,
          sala_id: null,
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
        observacao: data.observacao_entrada || 'Entrada no estoque central',
        quantidade_movimentada: data.quantidade_total ?? 1,
      });

      return item;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
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

// ==================== SAÍDA PARA UNIDADE ====================
// REGRA: Sempre atualizar o estado atual diretamente na tabela estoque_itens.
// Para itens por quantidade: se saída parcial, DIVIDE o registro em dois.

export function useRegistrarSaida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      unidadeDestinoId,
      salaDestinoId,
      dataSaida,
      observacao,
      quantidadeSaida,
    }: {
      itemId: string;
      unidadeDestinoId: string;
      salaDestinoId?: string;
      dataSaida: string;
      observacao?: string;
      quantidadeSaida?: number;
    }) => {
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      const qtdSaida = quantidadeSaida || 1;
      let movItemId = itemId;

      if (itemAtual.controle_patrimonial) {
        // Item patrimonial: atualizar estado diretamente
        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            status: 'em_uso' as EstoqueStatus,
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;
      } else {
        // Item por quantidade
        if (qtdSaida > (itemAtual.quantidade_total || 0)) {
          throw new Error('Quantidade de saída excede o disponível');
        }

        if (qtdSaida === (itemAtual.quantidade_total || 0)) {
          // Saída total: atualizar o registro existente
          const { error: updateError } = await supabase
            .from('estoque_itens')
            .update({
              status: 'em_uso' as EstoqueStatus,
              unidade_atual_id: unidadeDestinoId,
              sala_id: salaDestinoId || null,
            })
            .eq('id', itemId);

          if (updateError) throw updateError;
        } else {
          // Saída parcial: reduzir origem e criar NOVO registro no destino
          const novaQtdOrigem = (itemAtual.quantidade_total || 0) - qtdSaida;
          
          const { error: updateError } = await supabase
            .from('estoque_itens')
            .update({
              quantidade_total: novaQtdOrigem,
              quantidade: novaQtdOrigem,
            })
            .eq('id', itemId);

          if (updateError) throw updateError;

          // Criar novo registro no destino
          const { data: novoItem, error: insertError } = await supabase
            .from('estoque_itens')
            .insert({
              produto_id: itemAtual.produto_id,
              quantidade: qtdSaida,
              quantidade_total: qtdSaida,
              controle_patrimonial: false,
              status: 'em_uso' as EstoqueStatus,
              unidade_atual_id: unidadeDestinoId,
              sala_id: salaDestinoId || null,
              data_entrada: itemAtual.data_entrada,
              responsavel_entrada_id: user?.id,
              observacao_entrada: `Saída parcial do lote ${itemId}`,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          movItemId = novoItem.id;
        }
      }

      // Registrar histórico
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: movItemId,
        tipo: 'saida' as MovimentacaoTipo,
        data_movimentacao: dataSaida,
        unidade_origem_id: itemAtual.unidade_atual_id || null,
        unidade_destino_id: unidadeDestinoId,
        sala_destino_id: salaDestinoId || null,
        responsavel_id: user?.id,
        observacao: observacao || 'Saída para unidade',
        quantidade_movimentada: qtdSaida,
      });

      if (movError) throw movError;
      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Saída registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error registering saida:', error);
      toast.error(error.message || 'Erro ao registrar saída');
    },
  });
}

// ==================== TRANSFERÊNCIA ENTRE UNIDADES ====================
// REGRA: Atualizar estado diretamente. Para qty parcial, dividir registro.

export function useRegistrarTransferencia() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      unidadeOrigemId,
      salaOrigemId,
      unidadeDestinoId,
      salaDestinoId,
      dataTransferencia,
      observacao,
      quantidade,
    }: {
      itemId: string;
      unidadeOrigemId: string;
      salaOrigemId?: string;
      unidadeDestinoId: string;
      salaDestinoId?: string;
      dataTransferencia: string;
      observacao?: string;
      quantidade?: number;
    }) => {
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      const qtd = quantidade || 1;
      let movItemId = itemId;

      if (itemAtual.controle_patrimonial) {
        // Patrimonial: mover diretamente
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', itemId);
        if (error) throw error;
      } else {
        if (qtd > (itemAtual.quantidade_total || 0)) {
          throw new Error('Quantidade excede o disponível neste item');
        }

        if (qtd === (itemAtual.quantidade_total || 0)) {
          // Transferência total
          const { error } = await supabase
            .from('estoque_itens')
            .update({
              unidade_atual_id: unidadeDestinoId,
              sala_id: salaDestinoId || null,
            })
            .eq('id', itemId);
          if (error) throw error;
        } else {
          // Transferência parcial: dividir
          const novaQtdOrigem = (itemAtual.quantidade_total || 0) - qtd;

          const { error: updateError } = await supabase
            .from('estoque_itens')
            .update({
              quantidade_total: novaQtdOrigem,
              quantidade: novaQtdOrigem,
            })
            .eq('id', itemId);
          if (updateError) throw updateError;

          const { data: novoItem, error: insertError } = await supabase
            .from('estoque_itens')
            .insert({
              produto_id: itemAtual.produto_id,
              quantidade: qtd,
              quantidade_total: qtd,
              controle_patrimonial: false,
              status: 'em_uso' as EstoqueStatus,
              unidade_atual_id: unidadeDestinoId,
              sala_id: salaDestinoId || null,
              data_entrada: itemAtual.data_entrada,
              responsavel_entrada_id: user?.id,
              observacao_entrada: `Transferência parcial do item ${itemId}`,
            })
            .select()
            .single();
          if (insertError) throw insertError;
          movItemId = novoItem.id;
        }
      }

      // Registrar histórico
      await supabase.from('estoque_movimentacoes').insert({
        item_id: movItemId,
        tipo: 'transferencia' as MovimentacaoTipo,
        data_movimentacao: dataTransferencia,
        unidade_origem_id: unidadeOrigemId,
        unidade_destino_id: unidadeDestinoId,
        sala_origem_id: salaOrigemId || null,
        sala_destino_id: salaDestinoId || null,
        responsavel_id: user?.id,
        observacao: observacao || 'Transferência entre unidades',
        quantidade_movimentada: qtd,
      });

      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Transferência registrada com sucesso!');
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
      itemId,
      dataRetorno,
      observacao,
      quantidade,
    }: {
      itemId: string;
      dataRetorno: string;
      observacao?: string;
      quantidade?: number;
    }) => {
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      const qtd = quantidade || (itemAtual.quantidade_total || 1);
      let movItemId = itemId;

      if (itemAtual.controle_patrimonial || qtd === (itemAtual.quantidade_total || 0)) {
        // Retorno total: limpar localização, voltar para disponível
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
        // Retorno parcial: reduzir no destino, criar novo disponível no central
        const novaQtd = (itemAtual.quantidade_total || 0) - qtd;

        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            quantidade_total: novaQtd,
            quantidade: novaQtd,
          })
          .eq('id', itemId);
        if (updateError) throw updateError;

        const { data: novoItem, error: insertError } = await supabase
          .from('estoque_itens')
          .insert({
            produto_id: itemAtual.produto_id,
            quantidade: qtd,
            quantidade_total: qtd,
            controle_patrimonial: false,
            status: 'disponivel' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
            data_entrada: itemAtual.data_entrada,
            responsavel_entrada_id: user?.id,
            observacao_entrada: `Retorno ao estoque central do item ${itemId}`,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        movItemId = novoItem.id;
      }

      // Registrar histórico
      await supabase.from('estoque_movimentacoes').insert({
        item_id: movItemId,
        tipo: 'devolucao' as MovimentacaoTipo,
        data_movimentacao: dataRetorno,
        unidade_origem_id: itemAtual.unidade_atual_id,
        sala_origem_id: itemAtual.sala_id,
        unidade_destino_id: null,
        responsavel_id: user?.id,
        observacao: observacao || 'Retorno ao estoque central',
        quantidade_movimentada: qtd,
      });

      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
      toast.success('Retorno registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error registering retorno:', error);
      toast.error(error.message || 'Erro ao registrar retorno');
    },
  });
}

// ==================== MANUTENÇÃO ====================
// REGRA: Atualizar estado diretamente. Limpar unidade/sala (equipamento sai para reparo).

export function useRegistrarManutencao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      itemId,
      dataManutencao,
      observacao,
      quantidade,
    }: {
      itemId: string;
      dataManutencao: string;
      observacao?: string;
      quantidade?: number;
    }) => {
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      const qtd = quantidade || (itemAtual.quantidade_total || 1);
      let movItemId = itemId;

      if (itemAtual.controle_patrimonial || qtd === (itemAtual.quantidade_total || 0)) {
        // Manutenção total: atualizar estado
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'manutencao' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', itemId);
        if (error) throw error;
      } else {
        // Manutenção parcial: dividir
        const novaQtd = (itemAtual.quantidade_total || 0) - qtd;

        const { error: updateError } = await supabase
          .from('estoque_itens')
          .update({
            quantidade_total: novaQtd,
            quantidade: novaQtd,
          })
          .eq('id', itemId);
        if (updateError) throw updateError;

        const { data: novoItem, error: insertError } = await supabase
          .from('estoque_itens')
          .insert({
            produto_id: itemAtual.produto_id,
            quantidade: qtd,
            quantidade_total: qtd,
            controle_patrimonial: false,
            status: 'manutencao' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
            data_entrada: itemAtual.data_entrada,
            responsavel_entrada_id: user?.id,
            observacao_entrada: `Enviado para manutenção do item ${itemId}`,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        movItemId = novoItem.id;
      }

      // Registrar histórico
      await supabase.from('estoque_movimentacoes').insert({
        item_id: movItemId,
        tipo: 'manutencao' as MovimentacaoTipo,
        data_movimentacao: dataManutencao,
        unidade_origem_id: itemAtual.unidade_atual_id,
        sala_origem_id: itemAtual.sala_id,
        responsavel_id: user?.id,
        observacao: observacao || 'Equipamento em manutenção',
        quantidade_movimentada: qtd,
      });

      return true;
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

// Retorno da manutenção: equipamento volta para uso ou estoque central
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
      const { data: itemAtual, error: fetchError } = await supabase
        .from('estoque_itens')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      if (destino === 'estoque_central') {
        // Volta para o estoque central como disponível
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
        // Volta para unidade específica
        if (!unidadeDestinoId) throw new Error('Informe a unidade de destino');
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'em_uso' as EstoqueStatus,
            unidade_atual_id: unidadeDestinoId,
            sala_id: salaDestinoId || null,
          })
          .eq('id', itemId);
        if (error) throw error;
      }

      // Registrar histórico
      await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        tipo: 'retorno_manutencao' as MovimentacaoTipo,
        data_movimentacao: dataRetorno,
        unidade_destino_id: destino === 'unidade' ? unidadeDestinoId : null,
        sala_destino_id: destino === 'unidade' ? (salaDestinoId || null) : null,
        responsavel_id: user?.id,
        observacao: observacao || 'Retorno da manutenção',
        quantidade_movimentada: itemAtual.controle_patrimonial ? 1 : (itemAtual.quantidade_total || 1),
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
        const { error } = await supabase.from('estoque_itens').insert({
          produto_id: itemOriginal.produto_id,
          numero_patrimonio: pat,
          quantidade: 1,
          controle_patrimonial: true,
          quantidade_total: 1,
          status: itemOriginal.status,
          unidade_atual_id: itemOriginal.unidade_atual_id,
          sala_id: itemOriginal.sala_id,
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

      return true;
    },
    onSuccess: () => {
      invalidateEstoqueQueries(queryClient);
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
          unidade_destino:unidades!estoque_movimentacoes_unidade_destino_id_fkey(id, nome),
          sala_origem:salas!estoque_movimentacoes_sala_origem_id_fkey(id, nome),
          sala_destino:salas!estoque_movimentacoes_sala_destino_id_fkey(id, nome)
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

// Movimentações por produto (all items of a product)
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
        .select('status, quantidade, quantidade_total, controle_patrimonial');

      if (error) throw error;

      const getQty = (item: any) => item.controle_patrimonial ? 1 : (item.quantidade_total || 1);

      const stats = {
        total: data.reduce((acc, item) => acc + getQty(item), 0),
        disponivel: data.filter((i) => i.status === 'disponivel').reduce((acc, item) => acc + getQty(item), 0),
        em_uso: data.filter((i) => i.status === 'em_uso').reduce((acc, item) => acc + getQty(item), 0),
        manutencao: data.filter((i) => i.status === 'manutencao').reduce((acc, item) => acc + getQty(item), 0),
        baixa: data.filter((i) => i.status === 'baixa').reduce((acc, item) => acc + getQty(item), 0),
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
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !itemAtual) throw new Error('Item não encontrado');

      if (itemAtual.status === 'baixa') {
        throw new Error('Este equipamento já foi baixado.');
      }

      const qtdBaixa = quantidadeBaixa || (itemAtual.quantidade_total || 1);
      let movItemId = itemId;

      if (itemAtual.controle_patrimonial) {
        // Patrimonial: baixa direta
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            status: 'baixa' as EstoqueStatus,
            unidade_atual_id: null,
            sala_id: null,
          })
          .eq('id', itemId);
        if (error) throw error;
      } else {
        if (qtdBaixa > (itemAtual.quantidade_total || 0)) {
          throw new Error('Quantidade de baixa excede o disponível');
        }

        if (qtdBaixa === (itemAtual.quantidade_total || 0)) {
          // Baixa total
          const { error } = await supabase
            .from('estoque_itens')
            .update({
              status: 'baixa' as EstoqueStatus,
              unidade_atual_id: null,
              sala_id: null,
            })
            .eq('id', itemId);
          if (error) throw error;
        } else {
          // Baixa parcial: dividir
          const novaQtd = (itemAtual.quantidade_total || 0) - qtdBaixa;

          const { error: updateError } = await supabase
            .from('estoque_itens')
            .update({
              quantidade_total: novaQtd,
              quantidade: novaQtd,
            })
            .eq('id', itemId);
          if (updateError) throw updateError;

          const { data: novoItem, error: insertError } = await supabase
            .from('estoque_itens')
            .insert({
              produto_id: itemAtual.produto_id,
              quantidade: qtdBaixa,
              quantidade_total: qtdBaixa,
              controle_patrimonial: false,
              status: 'baixa' as EstoqueStatus,
              unidade_atual_id: null,
              sala_id: null,
              data_entrada: itemAtual.data_entrada,
              responsavel_entrada_id: user?.id,
              observacao_entrada: `Baixa parcial do item ${itemId}`,
            })
            .select()
            .single();
          if (insertError) throw insertError;
          movItemId = novoItem.id;
        }
      }

      // Registrar histórico
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: movItemId,
        tipo: 'baixa' as MovimentacaoTipo,
        data_movimentacao: dataBaixa,
        unidade_origem_id: itemAtual.unidade_atual_id || null,
        sala_origem_id: itemAtual.sala_id || null,
        unidade_destino_id: null,
        responsavel_id: user?.id,
        observacao: motivo || 'Baixa de equipamento',
        quantidade_movimentada: qtdBaixa,
      });

      if (movError) throw movError;
      return true;
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

// ==================== BUSCA ITENS PARA BAIXA ====================

export function useEstoqueItensParaBaixa(searchTerm?: string) {
  return useQuery({
    queryKey: ['estoque-itens-para-baixa', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_itens')
        .select(`
          *,
          produto:produtos(id, nome, categoria),
          unidade_atual:unidades(id, nome),
          sala:salas(id, nome)
        `)
        .in('status', ['disponivel', 'em_uso'])
        .order('created_at', { ascending: false });

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
  queryClient.invalidateQueries({ queryKey: ['estoque-itens-para-baixa'] });
}
