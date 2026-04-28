import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [busy, setBusy]           = useState(false);

  // Já autenticado → redireciona para o dashboard
  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      );
    }
  }

  return (
    <div className="min-h-screen bg-unicri-navy flex items-center justify-center px-4">
      {/* Card de login */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-unicri-orange rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-unicri-orange/30">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">FluxD</h1>
          <p className="text-unicri-orange text-sm font-medium mt-1">Sistema Financeiro</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Entrar na conta</h2>
            <p className="text-xs text-gray-400 mt-0.5">Use as credenciais fornecidas pelo administrador</p>
          </div>

          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              className="input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <LogIn size={16} />
            }
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-6">
          FluxD · Sistema Financeiro v1.0
        </p>
      </div>
    </div>
  );
}
