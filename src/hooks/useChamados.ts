import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChamadoStatus, ChamadoWithRelations } from '@/types/database';
import { toast } from 'sonner';

export function useChamados(options?: { 
  status?: ChamadoStatus; 
  allChamados?: boolean;
  limit?: number;
}) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['chamados', options?.status, options?.allChamados, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('chamados')
        .select(`
          *,
          unidade:unidades(id, nome),
          problema:problemas(id, titulo)
        `)
        .order('created_at', { ascending: false });

      // If not admin or explicitly requesting own chamados
      if (!isAdmin || !options?.allChamados) {
        query = query.eq('usuario_id', user?.id);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChamadoWithRelations[];
    },
    enabled: !!user,
  });
}

export function useChamadoById(id: string) {
  return useQuery({
    queryKey: ['chamado', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chamados')
        .select(`
          *,
          unidade:unidades(id, nome),
          problema:problemas(id, titulo)
        `)
        .eq('id', id)
        .maybeSingle();
      
      // Buscar atendente separadamente se existir
      let atendente = null;
      if (data?.atendente_id) {
        const { data: atendenteData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .eq('id', data.atendente_id)
          .single();
        atendente = atendenteData;
      }

      if (error) throw error;
      return data ? { ...data, atendente } as ChamadoWithRelations : null;
    },
    enabled: !!id,
  });
}

export function useCreateChamado() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      unidade_id: string;
      problema_id?: string;
      problema_texto?: string;
      descricao: string;
    }) => {
      const { data: chamado, error } = await supabase
        .from('chamados')
        .insert({
          ...data,
          usuario_id: user?.id,
          status: 'aberto' as ChamadoStatus,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('chamados_historico').insert({
        chamado_id: chamado.id,
        usuario_id: user?.id,
        status_novo: 'aberto' as ChamadoStatus,
        observacao: 'Chamado criado',
      });

      return chamado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      toast.success('Chamado criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating chamado:', error);
      toast.error('Erro ao criar chamado');
    },
  });
}

export function useUpdateChamadoStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      observacao,
    }: {
      id: string;
      status: ChamadoStatus;
      observacao?: string;
    }) => {
      // Get current chamado
      const { data: currentChamado } = await supabase
        .from('chamados')
        .select('status')
        .eq('id', id)
        .single();

      const updateData: Record<string, any> = { status };

      if (status === 'em_atendimento') {
        updateData.atendente_id = user?.id;
        updateData.data_atendimento = new Date().toISOString();
      } else if (status === 'resolvido') {
        updateData.data_fechamento = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('chamados')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add to history
      await supabase.from('chamados_historico').insert({
        chamado_id: id,
        usuario_id: user?.id,
        status_anterior: currentChamado?.status as ChamadoStatus,
        status_novo: status,
        observacao: observacao || `Status alterado para ${status}`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      queryClient.invalidateQueries({ queryKey: ['chamado'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      console.error('Error updating chamado:', error);
      toast.error('Erro ao atualizar status');
    },
  });
}

export function useChamadosStats() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['chamados-stats', user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from('chamados').select('status');

      if (!isAdmin) {
        query = query.eq('usuario_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        aberto: data.filter((c) => c.status === 'aberto').length,
        em_atendimento: data.filter((c) => c.status === 'em_atendimento').length,
        resolvido: data.filter((c) => c.status === 'resolvido').length,
      };

      return stats;
    },
    enabled: !!user,
  });
}
