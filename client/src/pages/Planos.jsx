import { useState, useEffect } from 'react';
import { Check, Shield, Star, ExternalLink, AlertCircle, Users, Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { api } from '../services/api';

const PLANOS = [
  {
    id       : 'FREE',
    nome     : 'Free',
    preco    : 0,
    periodo  : 'para sempre',
    icone    : Shield,
    cor      : 'text-gray-400',
    empresas : '1 empresa',
    usuarios : '2 usuários',
    recursos : [
      'Dashboard financeiro',
      'Lançamentos (até 100/mês)',
      'Contas a Pagar e Receber',
      'Fluxo de Caixa',
    ],
  },
  {
    id       : 'PRO',
    nome     : 'Pro',
    preco    : 97,
    periodo  : '/mês',
    icone    : Star,
    cor      : 'text-unicri-orange',
    destaque : true,
    empresas : 'até 3 empresas',
    usuarios : 'Usuários ilimitados',
    recursos : [
      'Tudo do Free',
      'Lançamentos ilimitados',
      'Importação CSV e NF via XML',
      'Recorrências e Parcelamentos',
      'Relatórios DRE + PDF',
      'Conciliação bancária OFX',
      'Múltiplas empresas (até 3)',
      'Programação da Semana',
      'Suporte prioritário',
    ],
  },
];

const PLANO_KEY = { PRO: 'pro' };

export default function Planos() {
  const { empresaAtiva, fetchEmpresas } = useAuth();
  const [loadingPlano, setLoadingPlano] = useState(null);
  const [searchParams]                  = useSearchParams();

  const planoAtual = (empresaAtiva?.plano || 'FREE').toUpperCase();
  const checkout   = searchParams.get('checkout');

  // Ao voltar do Stripe, recarrega empresas para refletir plano atualizado
  useEffect(() => {
    if (checkout === 'success') fetchEmpresas();
  }, [checkout, fetchEmpresas]);

  const handleAssinar = async (planoId) => {
    if (!empresaAtiva?.id) return toast.error('Nenhuma empresa selecionada');
    const planoKey = PLANO_KEY[planoId];
    if (!planoKey) return;
    setLoadingPlano(planoId);
    try {
      const { url } = await api.billing.createCheckout({ plano: planoKey, empresa_id: empresaAtiva.id });
      if (url) {
        window.location.href = url;
      } else {
        toast.error('URL de checkout não retornada.');
      }
    } catch (e) {
      toast.error(e.message || 'Erro ao iniciar checkout.');
    } finally {
      setLoadingPlano(null);
    }
  };

  const handlePortal = async () => {
    if (!empresaAtiva?.id) return;
    setLoadingPlano('portal');
    try {
      const { url } = await api.billing.portal({ empresa_id: empresaAtiva.id });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error(e.message || 'Erro ao abrir portal.');
    } finally {
      setLoadingPlano(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle="Escolha o plano ideal para sua empresa"
      />

      {checkout === 'success' && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 mb-6">
          <Check size={18} className="shrink-0" />
          <span><strong>Assinatura ativada!</strong> Todos os recursos do seu plano estão liberados.</span>
        </div>
      )}
      {checkout === 'cancel' && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 mb-6">
          <AlertCircle size={18} className="shrink-0" />
          <span>Assinatura não concluída. Você pode tentar novamente quando quiser.</span>
        </div>
      )}

      {planoAtual !== 'FREE' && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-unicri-orange/10 rounded-xl flex items-center justify-center">
              <Star size={18} className="text-unicri-orange" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">
                Plano atual: <span className="text-unicri-orange">{planoAtual}</span>
              </div>
              <div className="text-xs text-gray-500">Gerencie sua assinatura pelo portal Stripe</div>
            </div>
          </div>
          <button onClick={handlePortal} disabled={loadingPlano === 'portal'}
            className="btn-secondary flex items-center gap-2">
            <ExternalLink size={14} />
            {loadingPlano === 'portal' ? 'Aguarde…' : 'Gerenciar assinatura'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
        {PLANOS.map((plano) => {
          const Icone    = plano.icone;
          const ativo    = planoAtual === plano.id;
          const loading  = loadingPlano === plano.id;

          return (
            <div
              key={plano.id}
              className={`card p-6 flex flex-col relative overflow-hidden
                ${plano.destaque ? 'border-2 border-unicri-orange' : ''}
                ${ativo ? 'ring-2 ring-offset-1 ring-unicri-orange/50' : ''}
              `}
            >
              {plano.destaque && (
                <div className="absolute top-0 right-0 bg-unicri-orange text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Icone size={18} className={plano.cor} />
                <span className="text-sm font-bold text-gray-700">{plano.nome}</span>
                {ativo && (
                  <span className="ml-auto text-xs bg-unicri-orange/10 text-unicri-orange px-2 py-0.5 rounded-full">
                    Atual
                  </span>
                )}
              </div>

              <div className="mb-4">
                {plano.preco === 0 ? (
                  <div className="text-3xl font-bold text-gray-900">R$ 0</div>
                ) : (
                  <div className="text-3xl font-bold text-gray-900">
                    R$ {plano.preco}<span className="text-base font-normal text-gray-400">{plano.periodo}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">{plano.periodo === 'para sempre' ? 'para sempre' : 'cancele quando quiser'}</div>
              </div>

              <div className="flex flex-col gap-1 mb-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Building2 size={12} className="shrink-0" /> {plano.empresas}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={12} className="shrink-0" /> {plano.usuarios}
                </div>
              </div>

              <ul className="space-y-1.5 flex-1 mb-5">
                {plano.recursos.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={13} className={`${plano.cor} mt-0.5 shrink-0`} /> {r}
                  </li>
                ))}
              </ul>

              {plano.id === 'FREE' ? (
                <button className="btn-secondary w-full" disabled>
                  {ativo ? 'Plano atual' : 'Começar grátis'}
                </button>
              ) : ativo ? (
                <button onClick={handlePortal} disabled={loadingPlano === 'portal'}
                  className="btn-secondary w-full flex items-center justify-center gap-2">
                  <ExternalLink size={13} /> Gerenciar
                </button>
              ) : (
                <button
                  onClick={() => handleAssinar(plano.id)}
                  disabled={!!loadingPlano}
                  className={`w-full flex items-center justify-center gap-2 ${plano.destaque ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {loading ? 'Aguarde…' : `Assinar — R$ ${plano.preco}/mês`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6 max-w-lg">
        Pagamento processado com segurança pelo Stripe. Cancele a qualquer momento pelo portal de assinatura. Sem multa ou fidelidade.
      </p>
    </div>
  );
}
