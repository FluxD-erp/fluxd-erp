import { useState } from 'react';
import { Check, Zap, Shield, Star, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { api } from '../services/api';

const RECURSOS_FREE = [
  'Dashboard financeiro',
  'Lançamentos (até 100/mês)',
  'Contas a Pagar e Receber',
  'Fluxo de Caixa',
  '1 empresa',
  '2 usuários',
];

const RECURSOS_PRO = [
  'Tudo do plano Free',
  'Lançamentos ilimitados',
  'Importação CSV/Excel',
  'Recorrências e Parcelamentos',
  'Programação da Semana',
  'Relatórios avançados (DRE)',
  'Múltiplas empresas',
  'Usuários ilimitados',
  'Suporte prioritário',
];

export default function Planos() {
  const { empresaAtiva } = useAuth();
  const [loading, setLoading]   = useState(false);
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();

  const planoAtual = empresaAtiva?.plano || 'FREE';
  const checkout   = searchParams.get('checkout');

  const handleAssinar = async () => {
    if (!empresaAtiva?.id) return toast.error('Nenhuma empresa selecionada');
    setLoading(true);
    try {
      const { url } = await api.billing.createCheckout({ plano: 'pro', empresa_id: empresaAtiva.id });
      window.location.href = url;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    if (!empresaAtiva?.id) return;
    setLoading(true);
    try {
      const { url } = await api.billing.portal({ empresa_id: empresaAtiva.id });
      window.location.href = url;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle="Escolha o plano ideal para sua empresa"
      />

      {/* Feedback de checkout */}
      {checkout === 'success' && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 mb-6">
          <Check size={18} className="shrink-0" />
          <span><strong>Assinatura ativada!</strong> Bem-vindo ao FluxD Pro. Todos os recursos estão liberados.</span>
        </div>
      )}
      {checkout === 'cancel' && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 mb-6">
          <AlertCircle size={18} className="shrink-0" />
          <span>Assinatura cancelada. Você pode tentar novamente quando quiser.</span>
        </div>
      )}

      {/* Plano atual */}
      {planoAtual !== 'FREE' && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-unicri-orange/10 rounded-xl flex items-center justify-center">
              <Star size={18} className="text-unicri-orange" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">Você está no plano <span className="text-unicri-orange">{planoAtual}</span></div>
              <div className="text-xs text-gray-500">Gerencie sua assinatura pelo portal Stripe</div>
            </div>
          </div>
          <button onClick={handlePortal} disabled={loading}
            className="btn-secondary flex items-center gap-2">
            <ExternalLink size={14} /> Gerenciar assinatura
          </button>
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* FREE */}
        <div className={`card p-6 flex flex-col ${planoAtual === 'FREE' ? 'ring-2 ring-gray-300' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-700">Free</span>
            {planoAtual === 'FREE' && (
              <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Plano atual</span>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">R$ 0</div>
          <div className="text-xs text-gray-400 mb-5">para sempre</div>
          <ul className="space-y-2 flex-1 mb-6">
            {RECURSOS_FREE.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <Check size={14} className="text-gray-400 mt-0.5 shrink-0" /> {r}
              </li>
            ))}
          </ul>
          <button className="btn-secondary w-full" disabled>Plano atual</button>
        </div>

        {/* PRO */}
        <div className={`card p-6 flex flex-col border-2 relative overflow-hidden ${planoAtual === 'PRO' ? 'border-unicri-orange' : 'border-unicri-orange/40'}`}>
          <div className="absolute top-0 right-0 bg-unicri-orange text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            POPULAR
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-unicri-orange" />
            <span className="text-sm font-bold text-gray-700">Pro</span>
            {planoAtual === 'PRO' && (
              <span className="ml-auto text-xs bg-unicri-orange/10 text-unicri-orange px-2 py-0.5 rounded-full">Plano atual</span>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            R$ 97<span className="text-base font-normal text-gray-400">/mês</span>
          </div>
          <div className="text-xs text-gray-400 mb-5">por empresa · cancele quando quiser</div>
          <ul className="space-y-2 flex-1 mb-6">
            {RECURSOS_PRO.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={14} className="text-unicri-orange mt-0.5 shrink-0" /> {r}
              </li>
            ))}
          </ul>
          {planoAtual === 'PRO' ? (
            <button onClick={handlePortal} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2">
              <ExternalLink size={14} /> Gerenciar assinatura
            </button>
          ) : (
            <button onClick={handleAssinar} disabled={loading}
              className="btn-primary w-full justify-center">
              {loading ? 'Aguarde…' : 'Assinar Pro — R$ 97/mês'}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 max-w-md">
        Pagamento processado com segurança pelo Stripe. Você pode cancelar a qualquer momento direto pelo portal de assinatura. Sem multa ou fidelidade.
      </p>
    </div>
  );
}
