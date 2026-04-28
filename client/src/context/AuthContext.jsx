import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else   setLoading(false);
    });

    // Escuta mudanças de auth (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) fetchProfile(u.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --- helpers de permissão ---
  const isAdmin      = profile?.perfil === 'ADMIN';
  const isFinanceiro = profile?.perfil === 'FINANCEIRO' || isAdmin;
  const isActive     = profile?.ativo === true;

  /** Pode gravar dados financeiros */
  const canWrite = isActive && isFinanceiro;
  /** Pode acessar o sistema (qualquer perfil ativo) */
  const canRead  = isActive;

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    setProfile(null);
    return supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin, isFinanceiro, isActive, canWrite, canRead,
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
};
