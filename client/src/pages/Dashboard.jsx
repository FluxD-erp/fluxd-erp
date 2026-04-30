import { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Clock, CheckCircle, ArrowUpRight, ArrowDownRight, Wallet, Target, Pencil,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { api, fmt, fmtData, fmtMes } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BRAND, CHART_COLORS } from '../theme';
import OnboardingChecklist from '../components/OnboardingChecklist';

const COLORS = CHART_COLORS;

// ── Seletor de mês/ano ───────────────────────────────────────────
function MesSeletor({ value, onChange }) {
  const [ano, mes] = value.split('-').map(Number);

  const anterior = () => {
    const d = new Date(ano, mes - 2, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const proximo = () => {
    const hoje = new Date();
    const d    = new Date(ano, mes, 1);
    if (d > hoje) return;
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const hojeStr  = new Date().toISOString().slice(0, 7);
  const isFuturo = value >= hojeStr;

  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <div className="flex items-center gap-1">
      <button onClick={anterior} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">
        {nomes[mes - 1]} {ano}
      </span>
      <button onClick={proximo} disabled={isFuturo}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon: Icon, color, pct }) {
  const palette = {
    orange: 'bg-unicri-orange/10 text-unicri-orange',
    navy  : 'bg-unicri-navy/10 text-unicri-navy',
    green : 'bg-emerald-100 text-emerald-600',
    red   : 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    teal  : 'bg-teal-100 text-teal-600',
  };
  const trendColor = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${palette[color]}`}>
          <Icon size={20} />
        </div>
        {pct !== null && pct !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            {pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(pct)}% vs mês ant.
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Meta Mensal (inline edit) ────────────────────────────────────
function MetaMensal({ empresaId, receitaMes }) {
  const key   = `fluxd_meta_${empresaId}`;
  const [meta, setMeta]       = useState(() => parseFloat(localStorage.getItem(key) || '0'));
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const ref = useRef();

  const salvar = () => {
    const v = parseFloat(input.replace(',', '.'));
    if (!isNaN(v) && v > 0) { setMeta(v); localStorage.setItem(key, v); }
    setEditing(false);
  };

  if (!meta && !editing) {
    return (
      <button onClick={() => { setInput(''); setEditing(true); }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-unicri-orange transition-colors">
        <Target size={13} /> Definir meta mensal
      </button>
    );
  }

  const pct = meta > 0 ? Math.min(100, Math.round((receitaMes / meta) * 100)) : 0;

  return (
    <div className="flex items-center gap-3">
      <Target size={14} className="text-unicri-orange shrink-0" />
      {editing ? (
        <div className="flex items-center gap-1">
          <input ref={ref} type="number" className="input py-1 px-2 text-xs w-32" placeholder="Meta em R$"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus />
          <button onClick={salvar} className="text-xs btn-primary py-1 px-2">OK</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-500">Meta: <strong>{fmt(meta)}</strong></span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-16">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-unicri-orange'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-semibold ${pct >= 100 ? 'text-emerald-600' : 'text-unicri-orange'}`}>{pct}%</span>
          <button onClick={() => { setInput(meta); setEditing(true); }}
            className="text-gray-300 hover:text-gray-500">
            <Pencil size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  const { empresaAtiva } = useAuth();
  const [mesSel, setMesSel]   = useState(() => new Date().toISOString().slice(0, 7));
  const [kpis, setKpis]       = useState(null);
  const [fluxo, setFluxo]     = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [ultimos, setUltimos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.dashboard.kpis(mesSel),
      api.dashboard.fluxoMensal(),
      api.dashboard.distribuicaoDespesas(mesSel),
      api.dashboard.ultimosLancamentos(),
    ]).then(([k, f, d, u]) => {
      setKpis(k);
      setFluxo(f.map(m => ({ ...m, mes: fmtMes(m.mes) })));
      setDespesas(d);
      setUltimos(u);
    }).catch(console.error).finally(() => setLoading(false));
  }, [mesSel]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-unicri-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusBadge = (status) => {
    const map = {
      PAGO: 'badge-pago', RECEBIDA: 'badge-pago',
      PENDENTE: 'badge-pendente', ABERTA: 'badge-pendente',
      VENCIDA: 'badge-vencido', CANCELADO: 'badge-cancelado',
    };
    return <span className={map[status] || 'badge-pendente'}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do desempenho financeiro</p>
        </div>
        <div className="flex items-center gap-4">
          <MesSeletor value={mesSel} onChange={setMesSel} />
          <MetaMensal empresaId={empresaAtiva?.id} receitaMes={kpis?.receita_mes || 0} />
        </div>
      </div>

      {/* Onboarding */}
      <OnboardingChecklist kpis={kpis} lancamentos={ultimos} />

      {/* Alerta de vencidas */}
      {kpis?.vencidas?.qtd > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="shrink-0 text-red-500" />
          <span>
            <strong>{kpis.vencidas.qtd} conta(s) vencida(s)</strong> no valor de{' '}
            <strong>{fmt(kpis.vencidas.total)}</strong>. Regularize o quanto antes.
          </span>
        </div>
      )}

      {/* KPIs — linha 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita do Mês"
          value={fmt(kpis?.receita_mes)}
          icon={TrendingUp}
          color="green"
          pct={kpis?.receita_pct}
        />
        <KpiCard
          title="Despesa do Mês"
          value={fmt(kpis?.despesa_mes)}
          icon={TrendingDown}
          color="red"
          pct={kpis?.despesa_pct !== null && kpis?.despesa_pct !== undefined ? -kpis.despesa_pct : null}
        />
        <KpiCard
          title="Resultado do Mês"
          value={fmt(kpis?.resultado_mes)}
          subtitle={kpis?.resultado_mes >= 0 ? 'Superávit' : 'Déficit'}
          icon={DollarSign}
          color={kpis?.resultado_mes >= 0 ? 'orange' : 'red'}
        />
        <KpiCard
          title="Saldo em Caixa"
          value={fmt(kpis?.saldo_caixa)}
          subtitle="Acumulado real (pagos)"
          icon={Wallet}
          color={kpis?.saldo_caixa >= 0 ? 'teal' : 'red'}
        />
      </div>

      {/* KPIs — linha 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="A Receber"
          value={fmt(kpis?.contas_receber?.total)}
          subtitle={`${kpis?.contas_receber?.qtd || 0} título(s) em aberto`}
          icon={Clock}
          color="navy"
        />
        <KpiCard
          title="A Pagar"
          value={fmt(kpis?.contas_pagar?.total)}
          subtitle={`${kpis?.contas_pagar?.qtd || 0} título(s) em aberto`}
          icon={TrendingDown}
          color="yellow"
        />
        <KpiCard
          title="Vencidas"
          value={fmt(kpis?.vencidas?.total)}
          subtitle={`${kpis?.vencidas?.qtd || 0} conta(s)`}
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="Vence em 7 dias"
          value={`${kpis?.a_vencer_7dias || 0} conta(s)`}
          icon={CheckCircle}
          color="yellow"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Receitas × Despesas — Últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fluxo} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Distribuição de Despesas</h2>
          {despesas.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={despesas} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="total" nameKey="nome" paddingAngle={3}>
                    {despesas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {despesas.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 flex-1 truncate">{d.nome}</span>
                    <span className="font-semibold text-gray-800">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">Sem dados no período</div>
          )}
        </div>
      </div>

      {/* Resultado acumulado */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Resultado Acumulado — Últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={fluxo}>
            <defs>
              <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND.teal} stopOpacity={0.2} />
                <stop offset="95%" stopColor={BRAND.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="resultado" name="Resultado" stroke={BRAND.teal}
              fill="url(#gradRes)" strokeWidth={2} dot={{ fill: BRAND.teal, r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos lançamentos */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Últimos Lançamentos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ultimos.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{l.descricao}</td>
                  <td className="px-5 py-3">
                    <span className={l.tipo === 'RECEITA' ? 'badge-receita' : 'badge-despesa'}>{l.tipo}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{fmtData(l.data_competencia)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {l.tipo === 'DESPESA' ? '−' : '+'}{fmt(l.valor)}
                  </td>
                  <td className="px-5 py-3">{statusBadge(l.status)}</td>
                </tr>
              ))}
              {ultimos.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
