import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function DefinirSenha() {
  const navigate = useNavigate();
  const [session, setSession]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const [done, setDone]           = useState(false);

  // O Supabase processa automaticamente o hash #access_token da URL.
  // Esperamos o evento PASSWORD_RECOVERY ou SIGNED_IN (tipo invite).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && sess) {
        setSession(sess);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
    toast.success('Senha definida com sucesso!');
    setTimeout(() => navigate('/'), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-unicri-navy flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-unicri-navy flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
          <p className="text-red-600 font-semibold">Link inválido ou expirado.</p>
          <p className="text-sm text-gray-500">
            Peça ao administrador que reenvie o convite.
          </p>
          <button onClick={() => navigate('/login')} className="btn-secondary w-full justify-center">
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-unicri-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-unicri-orange rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-unicri-orange/30">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">FluxD</h1>
          <p className="text-unicri-orange text-sm font-medium mt-1">Sistema Financeiro</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl space-y-5">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-gray-800">Senha definida!</p>
              <p className="text-sm text-gray-500">Redirecionando para o sistema…</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Bem-vindo ao FluxD</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Crie uma senha para ativar seu acesso.
                </p>
              </div>

              <div className="bg-unicri-cream border border-unicri-orange/20 rounded-lg px-4 py-3 text-xs text-gray-600">
                Conectado como <span className="font-medium">{session.user.email}</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirmar senha</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input"
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <KeyRound size={16} />
                  }
                  {busy ? 'Salvando…' : 'Definir senha e entrar'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          FluxD · Sistema Financeiro v1.0
        </p>
      </div>
    </div>
  );
}
