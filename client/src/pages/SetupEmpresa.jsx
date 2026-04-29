import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SetupEmpresa() {
  const navigate = useNavigate();
  const { setEmpresaAtiva, fetchEmpresas } = useAuth();

  const [form, setForm] = useState({ nome: '', cnpj: '' });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome da empresa é obrigatório.');
    setBusy(true);
    try {
      const empresa = await api.empresas.criar({
        nome: form.nome.trim(),
        cnpj: form.cnpj.replace(/\D/g, '') || null,
      });
      setEmpresaAtiva(empresa);
      await fetchEmpresas();
      toast.success(`Empresa "${empresa.nome}" criada com sucesso!`);
      navigate('/');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-unicri-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-unicri-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-unicri-orange/30">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-unicri-navy">Bem-vindo ao FluxD</h1>
          <p className="text-gray-500 text-sm mt-1">Crie sua primeira empresa para começar</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-unicri-cream rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-unicri-orange" />
            </div>
            <div>
              <div className="font-semibold text-gray-800">Nova empresa</div>
              <div className="text-xs text-gray-400">Você poderá adicionar mais empresas depois</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome da empresa *</label>
              <input
                className="input"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Universidade da Criança"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">CNPJ <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input
                className="input"
                value={form.cnpj}
                onChange={e => set('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full mt-2 disabled:opacity-60"
            >
              {busy ? 'Criando…' : 'Criar empresa e entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Todos os seus dados ficam isolados por empresa.
        </p>
      </div>
    </div>
  );
}
