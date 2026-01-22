import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEnfermeira: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string): Promise<{ profile: Profile | null; role: AppRole | null }> => {
    try {
      // Fetch profile and role in parallel
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const fetchedProfile = profileResult.data as Profile | null;
      const fetchedRole = roleResult.data?.role as AppRole | null;

      setProfile(fetchedProfile);
      setRole(fetchedRole);

      return { profile: fetchedProfile, role: fetchedRole };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { profile: null, role: null };
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            await fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Wait for role to be fetched before setting loading to false
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Invalid login credentials') {
          return { error: 'E-mail ou senha incorretos' };
        }
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'Erro ao fazer login. Tente novamente.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'Erro ao fazer login com Google. Tente novamente.' };
    }
  };

  const signOut = async () => {
    try {
      // Limpar estados locais primeiro
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      
      // Tentar logout no servidor (pode falhar se sessão expirou)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during sign out:', error);
      // Mesmo com erro, os estados já foram limpos
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    isAdmin: role === 'admin',
    isEnfermeira: role === 'enfermeira',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
