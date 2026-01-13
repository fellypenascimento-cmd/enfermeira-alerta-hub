import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Unidade, Problema, User } from '@/types';
import { mockUnidades, mockProblemas, mockUsers } from '@/data/mockData';

interface DataContextType {
  // Unidades
  unidades: Unidade[];
  unidadesAtivas: Unidade[];
  createUnidade: (data: Omit<Unidade, 'id' | 'createdAt'>) => Promise<Unidade>;
  updateUnidade: (id: string, data: Partial<Unidade>) => Promise<void>;
  toggleUnidadeAtiva: (id: string) => Promise<void>;
  
  // Problemas
  problemas: Problema[];
  problemasAtivos: Problema[];
  createProblema: (data: Omit<Problema, 'id' | 'createdAt'>) => Promise<Problema>;
  updateProblema: (id: string, data: Partial<Problema>) => Promise<void>;
  toggleProblemaAtivo: (id: string) => Promise<void>;
  
  // Usuários
  users: User[];
  createUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  toggleUserAtivo: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [unidades, setUnidades] = useState<Unidade[]>(mockUnidades);
  const [problemas, setProblemas] = useState<Problema[]>(mockProblemas);
  const [users, setUsers] = useState<User[]>(mockUsers);

  // Unidades
  const unidadesAtivas = unidades.filter(u => u.ativa);
  
  const createUnidade = useCallback(async (data: Omit<Unidade, 'id' | 'createdAt'>): Promise<Unidade> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newUnidade: Unidade = {
      ...data,
      id: `unidade-${Date.now()}`,
      createdAt: new Date(),
    };
    setUnidades(prev => [...prev, newUnidade]);
    return newUnidade;
  }, []);
  
  const updateUnidade = useCallback(async (id: string, data: Partial<Unidade>): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUnidades(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }, []);
  
  const toggleUnidadeAtiva = useCallback(async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUnidades(prev => prev.map(u => u.id === id ? { ...u, ativa: !u.ativa } : u));
  }, []);

  // Problemas
  const problemasAtivos = problemas.filter(p => p.ativo);
  
  const createProblema = useCallback(async (data: Omit<Problema, 'id' | 'createdAt'>): Promise<Problema> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newProblema: Problema = {
      ...data,
      id: `problema-${Date.now()}`,
      createdAt: new Date(),
    };
    setProblemas(prev => [...prev, newProblema]);
    return newProblema;
  }, []);
  
  const updateProblema = useCallback(async (id: string, data: Partial<Problema>): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setProblemas(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);
  
  const toggleProblemaAtivo = useCallback(async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setProblemas(prev => prev.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p));
  }, []);

  // Usuários
  const createUser = useCallback(async (data: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newUser: User = {
      ...data,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, []);
  
  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }, []);
  
  const toggleUserAtivo = useCallback(async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  }, []);

  const value: DataContextType = {
    unidades,
    unidadesAtivas,
    createUnidade,
    updateUnidade,
    toggleUnidadeAtiva,
    problemas,
    problemasAtivos,
    createProblema,
    updateProblema,
    toggleProblemaAtivo,
    users,
    createUser,
    updateUser,
    toggleUserAtivo,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
