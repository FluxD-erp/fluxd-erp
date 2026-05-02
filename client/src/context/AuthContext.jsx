import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [empresas, setEmpresas]     = useState([]);      // empresas do usuário
  const [empresaAtiva, _setEmpresaAtiva] = useState(() => {
    // Restaura do localStorage
    try { return JSON.parse(localStorage.getItem('empresaAtiva') || 'null'); }
    catch { return null; }
  });
  const [loading, setLoading]       = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  /** Persiste a empresa ativa e atualiza o estado */
  const setEmpresaAtiva = useCallback((empresa) => {
    if (empresa) {
      localStorage.setItem('empresaAtiva', JSON.stringify(empresa));
    } else {
      localStorage.removeItem('empresaAtiva');
    }
    _setEmpresaAtiva(empresa);
  }, []);

  /** Busca o perfil do usuário no Supabase */
  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    return data;
  }

  /** Busca as empresas do usuário via API */
  const fetchEmpresas = useCallback(async () => {
    setLoadingEmpresas(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setEmpresas([]); return; }

      const apiBase = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${apiBase}/api/empresas`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) { setEmpresas([]); return; }
      const data = await res.json();
      setEmpresas(data || []);

      // Valida/auto-seleciona empresa ativa
      _setEmpresaAtiva(prev => {
        if (prev) {
          // Atualiza com dados frescos do servidor (ex: plano alterado pelo webhook)
          const atualizada = (data || []).find(e => e.id === prev.id);
          if (!atualizada) { localStorage.removeItem('empresaAtiva'); return null; }
          localStorage.setItem('empresaAtiva', JSON.stringify(atualizada));
          return atualizada;
        }
        // Sem empresa ativa: auto-seleciona a primeira disponível
        if (data && data.length > 0) {
          localStorage.setItem('empresaAtiva', JSON.stringify(data[0]));
          return data[0];
        }
        return null;
      });
    } catch {
      setEmpresas([]);
    } finally {
      setLoadingEmpresas(false);
    }
  }, []);

  /** Carrega perfil + empresas e finaliza o loading */
  async function initUser(userId) {
    const prof = await fetchProfile(userId);
    setLoading(false);
    if (prof) await fetchEmpresas();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) initUser(u.id);
      else   setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) initUser(u.id);
        else {
          setProfile(null);
          setEmpresas([]);
          setEmpresaAtiva(null);
          setLoading(false);
          // Sessão expirada ou inválida — redireciona para login
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
            window.location.href = '/login';
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- helpers de permissão ---
  const isAdmin      = profile?.perfil === 'ADMIN';
  const isFinanceiro = profile?.perfil === 'FINANCEIRO' || isAdmin;
  const isActive     = profile?.ativo === true;
  const canWrite     = isActive && isFinanceiro;
  const canRead      = isActive;

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password) {
    return supabase.auth.signUp({ email, password });
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  }

  async function signOut() {
    setProfile(null);
    setEmpresas([]);
    setEmpresaAtiva(null);
    return supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin, isFinanceiro, isActive, canWrite, canRead,
      empresas, empresaAtiva, setEmpresaAtiva,
      loadingEmpresas, fetchEmpresas,
      signIn, signUp, signInWithGoogle, signOut,
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
