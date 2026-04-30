import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    id      : 'lancamento',
    label   : 'Adicione seu primeiro lançamento',
    desc    : 'Registre uma receita ou despesa para começar a acompanhar o fluxo de caixa.',
    link    : '/lancamentos',
    cta     : 'Ir para Lançamentos',
  },
  {
    id      : 'conta_pagar',
    label   : 'Cadastre uma conta a pagar',
    desc    : 'Controle seus compromissos financeiros e evite surpresas no vencimento.',
    link    : '/contas-pagar',
    cta     : 'Ir para Contas a Pagar',
  },
  {
    id      : 'conta_receber',
    label   : 'Cadastre uma conta a receber',
    desc    : 'Acompanhe o que clientes ou parceiros devem à sua empresa.',
    link    : '/contas-receber',
    cta     : 'Ir para Contas a Receber',
  },
  {
    id      : 'fornecedor',
    label   : 'Cadastre um fornecedor ou cliente',
    desc    : 'Centralize os dados dos seus parceiros comerciais.',
    link    : '/fornecedores',
    cta     : 'Ir para Fornecedores',
  },
  {
    id      : 'colaborador',
    label   : 'Convide um colaborador',
    desc    : 'Adicione sua equipe ao sistema para colaborar em tempo real.',
    link    : '/configuracoes#usuarios',
    cta     : 'Gerenciar Usuários',
    adminOnly: true,
  },
];

export default function OnboardingChecklist({ kpis, lancamentos, planoContas }) {
  const { empresaAtiva, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const storageKey = `fluxd_onboarding_${empresaAtiva?.id || 'x'}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });
  const [hidden, setHidden] = useState(() =>
    localStorage.getItem(`${storageKey}_hidden`) === '1'
  );

  // Detecta conclusão a partir dos dados reais
  const autoCompleted = {
    lancamento    : (lancamentos?.length || 0) > 0,
    conta_pagar   : (kpis?.contas_pagar?.qtd  || 0) > 0,
    conta_receber : (kpis?.contas_receber?.qtd || 0) > 0,
    fornecedor    : dismissed.includes('fornecedor'),
    colaborador   : dismissed.includes('colaborador'),
  };

  const steps = STEPS.filter(s => !s.adminOnly || isAdmin);
  const doneIds = steps.filter(s => autoCompleted[s.id] || dismissed.includes(s.id)).map(s => s.id);
  const allDone = steps.every(s => doneIds.includes(s.id));

  // Salva dismissed no localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(dismissed));
  }, [dismissed]);

  const markDone = (id) => {
    if (!dismissed.includes(id)) setDismissed(d => [...d, id]);
  };

  const hideForever = () => {
    localStorage.setItem(`${storageKey}_hidden`, '1');
    setHidden(true);
  };

  if (hidden || allDone) return null;

  const pct = Math.round((doneIds.length / steps.length) * 100);

  return (
    <div className="card p-5 border border-unicri-orange/20 bg-gradient-to-br from-unicri-cream to-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-unicri-orange" />
          <div>
            <h3 className="text-sm font-bold text-gray-800">Configure o FluxD</h3>
            <p className="text-xs text-gray-500">{doneIds.length} de {steps.length} etapas concluídas</p>
          </div>
        </div>
        <button onClick={hideForever} className="text-gray-300 hover:text-gray-500 transition-colors" title="Fechar definitivamente">
          <X size={16} />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-unicri-orange rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map(step => {
          const done = doneIds.includes(step.id);
          return (
            <div key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                ${done
                  ? 'bg-emerald-50/60 border-emerald-100'
                  : 'bg-white border-gray-100 hover:border-unicri-orange/30'}`}>
              {done
                ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                : <Circle size={18} className="text-gray-300 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {step.label}
                </div>
                {!done && <div className="text-xs text-gray-400 truncate">{step.desc}</div>}
              </div>
              {!done && (
                <button
                  onClick={() => { markDone(step.id); navigate(step.link); }}
                  className="flex items-center gap-1 text-xs font-medium text-unicri-orange whitespace-nowrap hover:underline">
                  {step.cta} <ChevronRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
