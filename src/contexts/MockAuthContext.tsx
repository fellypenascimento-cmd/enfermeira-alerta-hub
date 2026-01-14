import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@/types';
import { mockUsers } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEnfermeira: boolean;
  isAuthenticated: boolean;
}

const MockAuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('mockUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!foundUser) {
      setLoading(false);
      return { error: 'Usuário não encontrado. Verifique o e-mail informado.' };
    }
    
    if (!foundUser.ativo) {
      setLoading(false);
      return { error: 'Usuário inativo. Entre em contato com o administrador.' };
    }
    
    if (password.length < 6) {
      setLoading(false);
      return { error: 'Senha inválida. A senha deve ter pelo menos 6 caracteres.' };
    }
    
    setUser(foundUser);
    localStorage.setItem('mockUser', JSON.stringify(foundUser));
    setLoading(false);
    
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem('mockUser');
    setLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin: user?.role === 'admin',
    isEnfermeira: user?.role === 'enfermeira',
    isAuthenticated: !!user,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}
