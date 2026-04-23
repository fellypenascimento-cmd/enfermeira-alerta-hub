import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Unidade } from '@/types/database';
import type { Sala } from '@/types/estoque';
import { toast } from 'sonner';

export function useUnidades(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['unidades', options?.includeInactive],
    queryFn: async () => {
      let query = supabase.from('unidades').select('*').order('nome');

      if (!options?.includeInactive) {
        query = query.eq('ativa', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Unidade[];
    },
  });
}

export function useCreateUnidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome: string; endereco?: string }) => {
      const { data: unidade, error } = await supabase
        .from('unidades')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return unidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidade criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar unidade');
    },
  });
}

export function useUpdateUnidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      nome?: string;
      endereco?: string;
      ativa?: boolean;
    }) => {
      const { data: unidade, error } = await supabase
        .from('unidades')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return unidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      toast.success('Unidade atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar unidade');
    },
  });
}

// ==================== SALAS ====================

export function useSalasPorUnidade(unidadeId: string | null, includeInactive = false) {
  return useQuery({
    queryKey: ['salas-unidade', unidadeId, includeInactive],
    queryFn: async () => {
      if (!unidadeId) return [];
      let query = supabase
        .from('salas')
        .select('*')
        .eq('unidade_id', unidadeId)
        .order('nome');
      if (!includeInactive) query = query.eq('ativa', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Sala[];
    },
    enabled: !!unidadeId,
  });
}

export function useCreateSalaUnidade() {
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
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salas-unidade', vars.unidade_id] });
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast.success('Sala criada!');
    },
    onError: () => toast.error('Erro ao criar sala'),
  });
}

export function useUpdateSalaUnidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; ativa?: boolean }) => {
      const { data: sala, error } = await supabase
        .from('salas')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return sala;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas-unidade'] });
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast.success('Sala atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar sala'),
  });
}
