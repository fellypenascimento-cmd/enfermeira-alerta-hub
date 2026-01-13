import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Chamado, ChamadoStatus, ChamadoHistorico, ChamadoCompleto } from '@/types';
import { mockChamados, mockHistorico, getUnidadeById, getProblemaById, getUserById, getChamadoHistorico } from '@/data/mockData';
import { useAuth } from './MockAuthContext';

interface ChamadosContextType {
  chamados: Chamado[];
  loading: boolean;
  getChamadosEnfermeira: () => ChamadoCompleto[];
  getChamadosAdmin: (filters?: ChamadoFilters) => ChamadoCompleto[];
  getChamadoById: (id: string) => ChamadoCompleto | undefined;
  createChamado: (data: CreateChamadoData) => Promise<Chamado>;
  updateStatus: (chamadoId: string, novoStatus: ChamadoStatus, observacao?: string) => Promise<void>;
  getStats: () => { abertos: number; emAtendimento: number; resolvidos: number; total: number };
  getChamadosPorUnidade: () => { unidade: string; total: number }[];
  getProblemasRecorrentes: () => { problema: string; total: number }[];
}

interface ChamadoFilters {
  status?: ChamadoStatus | 'todos';
  unidadeId?: string;
  usuarioId?: string;
  problemaId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

interface CreateChamadoData {
  unidadeId: string;
  problemaId: string;
  descricao: string;
}

const ChamadosContext = createContext<ChamadosContextType | undefined>(undefined);

export function ChamadosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>(mockChamados);
  const [historico, setHistorico] = useState<ChamadoHistorico[]>(mockHistorico);
  const [loading] = useState(false);

  const enrichChamado = useCallback((chamado: Chamado): ChamadoCompleto => {
    return {
      ...chamado,
      usuario: getUserById(chamado.usuarioId),
      unidade: getUnidadeById(chamado.unidadeId),
      problema: getProblemaById(chamado.problemaId),
      atendente: chamado.atendenteId ? getUserById(chamado.atendenteId) : undefined,
      historico: historico.filter(h => h.chamadoId === chamado.id),
    };
  }, [historico]);

  const getChamadosEnfermeira = useCallback((): ChamadoCompleto[] => {
    if (!user) return [];
    return chamados
      .filter(c => c.usuarioId === user.id)
      .map(enrichChamado)
      .sort((a, b) => new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime());
  }, [chamados, user, enrichChamado]);

  const getChamadosAdmin = useCallback((filters?: ChamadoFilters): ChamadoCompleto[] => {
    let filtered = [...chamados];
    
    if (filters) {
      if (filters.status && filters.status !== 'todos') {
        filtered = filtered.filter(c => c.status === filters.status);
      }
      if (filters.unidadeId) {
        filtered = filtered.filter(c => c.unidadeId === filters.unidadeId);
      }
      if (filters.usuarioId) {
        filtered = filtered.filter(c => c.usuarioId === filters.usuarioId);
      }
      if (filters.problemaId) {
        filtered = filtered.filter(c => c.problemaId === filters.problemaId);
      }
      if (filters.dataInicio) {
        filtered = filtered.filter(c => new Date(c.dataAbertura) >= filters.dataInicio!);
      }
      if (filters.dataFim) {
        filtered = filtered.filter(c => new Date(c.dataAbertura) <= filters.dataFim!);
      }
    }
    
    return filtered
      .map(enrichChamado)
      .sort((a, b) => new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime());
  }, [chamados, enrichChamado]);

  const getChamadoById = useCallback((id: string): ChamadoCompleto | undefined => {
    const chamado = chamados.find(c => c.id === id);
    return chamado ? enrichChamado(chamado) : undefined;
  }, [chamados, enrichChamado]);

  const createChamado = useCallback(async (data: CreateChamadoData): Promise<Chamado> => {
    if (!user) throw new Error('Usuário não autenticado');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newChamado: Chamado = {
      id: `ch-${Date.now()}`,
      numero: Math.max(...chamados.map(c => c.numero)) + 1,
      usuarioId: user.id,
      unidadeId: data.unidadeId,
      problemaId: data.problemaId,
      descricao: data.descricao,
      status: 'aberto',
      dataAbertura: new Date(),
      createdAt: new Date(),
    };
    
    setChamados(prev => [newChamado, ...prev]);
    
    return newChamado;
  }, [user, chamados]);

  const updateStatus = useCallback(async (
    chamadoId: string, 
    novoStatus: ChamadoStatus, 
    observacao?: string
  ): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setChamados(prev => prev.map(c => {
      if (c.id !== chamadoId) return c;
      
      const updates: Partial<Chamado> = { status: novoStatus };
      
      if (novoStatus === 'em_atendimento') {
        updates.atendenteId = user.id;
        updates.dataAtendimento = new Date();
      } else if (novoStatus === 'resolvido') {
        updates.dataFechamento = new Date();
      }
      
      return { ...c, ...updates };
    }));
    
    const chamado = chamados.find(c => c.id === chamadoId);
    if (chamado) {
      const newHistorico: ChamadoHistorico = {
        id: `hist-${Date.now()}`,
        chamadoId,
        usuarioId: user.id,
        statusAnterior: chamado.status,
        statusNovo: novoStatus,
        observacao,
        createdAt: new Date(),
      };
      
      setHistorico(prev => [newHistorico, ...prev]);
    }
  }, [user, chamados]);

  const getStats = useCallback(() => {
    const userChamados = user?.role === 'admin' ? chamados : chamados.filter(c => c.usuarioId === user?.id);
    return {
      abertos: userChamados.filter(c => c.status === 'aberto').length,
      emAtendimento: userChamados.filter(c => c.status === 'em_atendimento').length,
      resolvidos: userChamados.filter(c => c.status === 'resolvido').length,
      total: userChamados.length,
    };
  }, [chamados, user]);

  const getChamadosPorUnidade = useCallback(() => {
    const counts: Record<string, number> = {};
    chamados.forEach(c => {
      const unidade = getUnidadeById(c.unidadeId);
      const nome = unidade?.nome || 'Desconhecida';
      counts[nome] = (counts[nome] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([unidade, total]) => ({ unidade, total }))
      .sort((a, b) => b.total - a.total);
  }, [chamados]);

  const getProblemasRecorrentes = useCallback(() => {
    const counts: Record<string, number> = {};
    chamados.forEach(c => {
      const problema = getProblemaById(c.problemaId);
      const titulo = problema?.titulo || 'Desconhecido';
      counts[titulo] = (counts[titulo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([problema, total]) => ({ problema, total }))
      .sort((a, b) => b.total - a.total);
  }, [chamados]);

  const value: ChamadosContextType = {
    chamados,
    loading,
    getChamadosEnfermeira,
    getChamadosAdmin,
    getChamadoById,
    createChamado,
    updateStatus,
    getStats,
    getChamadosPorUnidade,
    getProblemasRecorrentes,
  };

  return (
    <ChamadosContext.Provider value={value}>
      {children}
    </ChamadosContext.Provider>
  );
}

export function useChamados() {
  const context = useContext(ChamadosContext);
  if (context === undefined) {
    throw new Error('useChamados must be used within a ChamadosProvider');
  }
  return context;
}
