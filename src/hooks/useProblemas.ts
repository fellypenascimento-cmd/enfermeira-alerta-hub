import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Problema } from '@/types/database';
import { toast } from 'sonner';

export function useProblemas(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['problemas', options?.includeInactive],
    queryFn: async () => {
      let query = supabase.from('problemas').select('*').order('titulo');

      if (!options?.includeInactive) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Problema[];
    },
  });
}

export function useCreateProblema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { titulo: string; descricao?: string }) => {
      const { data: problema, error } = await supabase
        .from('problemas')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return problema;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problemas'] });
      toast.success('Problema criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar problema');
    },
  });
}

export function useUpdateProblema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      titulo?: string;
      descricao?: string;
      ativo?: boolean;
    }) => {
      const { data: problema, error } = await supabase
        .from('problemas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return problema;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problemas'] });
      toast.success('Problema atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar problema');
    },
  });
}
