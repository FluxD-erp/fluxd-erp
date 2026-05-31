import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts';
import {
  FileText, TrendingUp, TrendingDown, Download,
  CheckCircle, Clock, BarChart2,
} from 'lucide-react';
import { api, fmt, fmtMes } from '../services/api';
import { BRAND } from '../theme';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { exportarDREpdf } from '../lib/drePdf';

// ── helpers ──────────────────────────────────────────────────────
const anoAtual = new Date().getFullYear();
const hoje     = new Date().toISOString().split('T')[0];

function periodoDefault() {
  return { inicio: `${anoAtual}-01-01`, fim: hoje };
}

// ── Toggle Realizado / Projetado ─────────────────────────────────
function ModoToggle({ modo, onChange }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
      {[['realizado', CheckCircle, 'Realizado'], ['projetado', Clock, 'Projetado']].map(([k, Icon, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`flex items-center gap-1.5 px-4 py-2 transition-colors
            ${modo === k
              ? 'bg-unicri-orange text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
          <Icon size={14} /> {l}
        </button>
      ))}
    </div>
  );
}

// ── Filtro de período ────────────────────────────────────────────
function FiltroPeriodo({ periodo, onChange, onGerar, extra }) {
  return (
    <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
      <div>
        <label className="label">Início</label>
        <input className="input" type="date" value={periodo.inicio}
          onChange={e => onChange(p => ({ ...p, inicio: e.target.value }))} />
      </div>
      <div>
        <label className="label">Fim</label>
        <input className="input" type="date" value={periodo.fim}
          onChange={e => onChange(p => ({ ...p, fim: e.target.value }))} />
      </div>
      <button className="btn-primary" onClick={onGerar}>
        <FileText size={16} /> Gerar
      </button>
      {extra}
    </div>
  );
}

// ── Badge de modo ────────────────────────────────────────────────
function ModoBadge({ modo }) {
  return modo === 'projetado'
    ? <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Projetado — inclui pendentes</span>
    : <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Realizado — apenas pagos</span>;
}

// ════════════════════════════════════════════════════════════════
// DRE
// ════════════════════════════════════════════════════════════════
function SecaoDRE() {
  const { empresaAtiva }                = useAuth();
  const [dre, setDre]                   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [exportando, setExportando]     = useState(false);
  const [analitico, setAnalitico]       = useState(false);
  const [modo, setModo]                 = useState('realizado');
  const [periodo, setPeriodo]           = useState(periodoDefault);

  const carregar = async () => {
    setLoading(true);
    try { setDre(await api.financeiro.dre({ ...periodo, modo })); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [modo, periodo]);

  const handleExportarPDF = async () => {
    if (!dre) return;
    setExportando(true);
    try {
      const dadosAnaliticos = analitico ? await api.financeiro.dreAnalitico(periodo) : null;
      await exportarDREpdf(dre, periodo, empresaAtiva, dadosAnaliticos);
    } finally { setExportando(false); }
  };

  const dreRows = dre ? [
    { label: 'Receita Bruta',     valor: dre.total_receitas, tipo: 'receita', bold: true },
    ...(dre.receitas || []).map(r => ({ label: `  ${r.nome}`, valor: r.total, tipo: 'receita' })),
    { label: 'Despesas Totais',   valor: dre.total_despesas, tipo: 'despesa', bold: true },
    ...(dre.despesas || []).map(d => ({ label: `  ${d.nome}`, valor: d.total, tipo: 'despesa' })),
    { label: 'RESULTADO LÍQUIDO', valor: dre.resultado, tipo: dre.resultado >= 0 ? 'positivo' : 'negativo', bold: true, destaque: true },
  ] : [];

  const barData = [
    { name: 'Receitas',  valor: dre?.total_receitas || 0, fill: '#10B981' },
    { name: 'Despesas',  valor: dre?.total_despesas || 0, fill: BRAND.navy },
    { name: 'Resultado', valor: dre?.resultado       || 0, fill: dre?.resultado >= 0 ? BRAND.teal : '#EF4444' },
  ];

  const margem = parseFloat(dre?.margem || 0);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <ModoToggle modo={modo} onChange={setModo} />
        {dre && (
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <ModoBadge modo={modo} />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={analitico}
                onChange={e => setAnalitico(e.target.checked)} className="rounded accent-unicri-orange" />
              Analítico no PDF
            </label>
            <button className="btn-primary" onClick={handleExportarPDF} disabled={exportando}>
              <Download size={15} /> {exportando ? 'Gerando…' : 'Exportar PDF'}
            </button>
          </div>
        )}
      </div>

      <FiltroPeriodo periodo={periodo} onChange={setPeriodo} onGerar={carregar} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-unicri-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dre && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabela DRE */}
          <div className="lg:col-span-2 card">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-bold text-gray-900">DRE — Demonstrativo de Resultado</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(dre.periodo.inicio + 'T12:00').toLocaleDateString('pt-BR')} a{' '}
                    {new Date(dre.periodo.fim    + 'T12:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <ModoBadge modo={modo} />
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {dreRows.map((row, i) => (
                <div key={i} className={`flex items-center justify-between px-6 py-2.5 text-sm
                  ${row.destaque ? 'bg-unicri-navy text-white rounded-b-xl' : ''}
                  ${row.bold && !row.destaque ? 'bg-gray-50' : ''}`}>
                  <div className={`flex items-center gap-2 ${row.bold ? 'font-bold' : 'text-gray-600 pl-4'} ${row.destaque ? 'text-white' : ''}`}>
                    {row.tipo === 'receita'  && row.bold && <TrendingUp   size={14} className="text-emerald-500" />}
                    {row.tipo === 'despesa'  && row.bold && <TrendingDown size={14} className="text-red-500" />}
                    {row.tipo === 'positivo' && <TrendingUp   size={14} className="text-emerald-400" />}
                    {row.tipo === 'negativo' && <TrendingDown size={14} className="text-red-400" />}
                    {row.label}
                  </div>
                  <div className={`font-${row.bold ? 'bold' : 'medium'} tabular-nums
                    ${row.destaque ? 'text-white text-lg' : ''}
                    ${row.tipo === 'receita'  ? 'text-emerald-600' : ''}
                    ${row.tipo === 'despesa'  ? 'text-red-500' : ''}
                    ${row.tipo === 'positivo' ? 'text-emerald-400' : ''}
                    ${row.tipo === 'negativo' ? 'text-red-400' : ''}
                  `}>{fmt(row.valor)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Margem Líquida</h3>
              <div className={`text-3xl font-black ${margem >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{margem}%</div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${margem >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs(margem), 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {margem >= 20 ? '✅ Margem saudável' : margem >= 0 ? '⚠️ Margem baixa' : '❌ Resultado negativo'}
              </p>
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Comparativo</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="valor" radius={[6,6,0,0]}>
                    {barData.map((b, i) => <Cell key={i} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Resumo</h3>
              {[
                { label: 'Receita Total', value: fmt(dre?.total_receitas), color: 'text-emerald-600' },
                { label: 'Despesa Total', value: fmt(dre?.total_despesas), color: 'text-red-500' },
                { label: 'Resultado',     value: fmt(dre?.resultado), color: dre?.resultado >= 0 ? 'text-unicri-navy font-bold' : 'text-red-600 font-bold' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className={r.color}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FLUXO DE CAIXA
// ════════════════════════════════════════════════════════════════
function SecaoFluxoCaixa() {
  const [fc, setFc]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo]     = useState('realizado');
  const [periodo, setPeriodo] = useState(periodoDefault);

  const carregar = async () => {
    setLoading(true);
    try { setFc(await api.financeiro.relatorioFC({ ...periodo, modo })); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [modo, periodo]);

  const chartData = (fc?.linhas || []).map(l => ({
    mes    : fmtMes(l.mes),
    Entradas: l.entradas,
    Saídas  : l.saidas,
    Saldo   : l.saldo_acumulado,
  }));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <ModoToggle modo={modo} onChange={setModo} />
        {fc && <ModoBadge modo={modo} />}
      </div>

      <FiltroPeriodo periodo={periodo} onChange={setPeriodo} onGerar={carregar} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-unicri-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fc && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Saldo Anterior',   value: fc.saldo_anterior,  color: 'text-gray-700' },
              { label: 'Total Entradas',   value: fc.total_entradas,  color: 'text-emerald-600' },
              { label: 'Total Saídas',     value: fc.total_saidas,    color: 'text-red-500' },
              { label: 'Resultado',        value: fc.resultado,       color: fc.resultado >= 0 ? 'text-unicri-orange font-bold' : 'text-red-600 font-bold' },
            ].map((k, i) => (
              <div key={i} className="card p-5">
                <div className={`text-2xl font-bold ${k.color}`}>{fmt(k.value)}</div>
                <div className="text-sm text-gray-500 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Tabela mensal */}
          <div className="card overflow-x-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-gray-900">Fluxo de Caixa Mensal</h2>
              <ModoBadge modo={modo} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3">Mês</th>
                  <th className="px-6 py-3 text-right text-emerald-600">Entradas</th>
                  <th className="px-6 py-3 text-right text-red-500">Saídas</th>
                  <th className="px-6 py-3 text-right">Resultado</th>
                  <th className="px-6 py-3 text-right">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(fc.linhas || []).map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{fmtMes(l.mes)}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-medium">{fmt(l.entradas)}</td>
                    <td className="px-6 py-3 text-right text-red-500 font-medium">{fmt(l.saidas)}</td>
                    <td className={`px-6 py-3 text-right font-semibold ${l.resultado >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                      {l.resultado >= 0 ? '+' : ''}{fmt(l.resultado)}
                    </td>
                    <td className={`px-6 py-3 text-right font-bold tabular-nums ${l.saldo_acumulado >= 0 ? 'text-unicri-orange' : 'text-red-600'}`}>
                      {fmt(l.saldo_acumulado)}
                    </td>
                  </tr>
                ))}
                {/* Total */}
                <tr className="bg-unicri-navy text-white">
                  <td className="px-6 py-3 font-bold">TOTAL</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-300">{fmt(fc.total_entradas)}</td>
                  <td className="px-6 py-3 text-right font-bold text-red-300">{fmt(fc.total_saidas)}</td>
                  <td className={`px-6 py-3 text-right font-bold ${fc.resultado >= 0 ? 'text-white' : 'text-red-300'}`}>
                    {fmt(fc.resultado)}
                  </td>
                  <td className="px-6 py-3 text-right font-bold">{fmt(fc.saldo_anterior + fc.resultado)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Gráfico */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Saldo Acumulado + Entradas × Saídas</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="Entradas" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="Saídas"   fill={BRAND.navy}   radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <ResponsiveContainer width="100%" height={160} className="mt-4">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradFC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BRAND.teal} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={BRAND.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="Saldo" stroke={BRAND.teal} fill="url(#gradFC)" strokeWidth={2}
                    dot={{ fill: BRAND.teal, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════════════════
export default function Relatorios() {
  const [tab, setTab] = useState('dre');

  return (
    <div>
      <PageHeader
        title="Relatórios Financeiros"
        subtitle="DRE e Fluxo de Caixa — Realizado e Projetado"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          ['dre', FileText, 'DRE'],
          ['fc',  BarChart2, 'Fluxo de Caixa'],
        ].map(([k, Icon, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === k
                ? 'border-unicri-orange text-unicri-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {tab === 'dre' && <SecaoDRE />}
      {tab === 'fc'  && <SecaoFluxoCaixa />}
    </div>
  );
}
