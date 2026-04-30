import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { api, fmt } from '../services/api';
import { BRAND } from '../theme';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { exportarDREpdf } from '../lib/drePdf';

export default function Relatorios() {
  const { empresaAtiva } = useAuth();
  const [dre, setDre]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exportando, setExportando] = useState(false);
  const [analitico, setAnalitico]   = useState(false); // incluir páginas analíticas
  const [periodo, setPeriodo] = useState(() => {
    const hoje = new Date();
    return {
      inicio: `${hoje.getFullYear()}-01-01`,
      fim: hoje.toISOString().split('T')[0],
    };
  });

  const carregar = async () => {
    setLoading(true);
    const data = await api.financeiro.dre(periodo);
    setDre(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [periodo]);

  const handleExportarPDF = async () => {
    if (!dre) return;
    setExportando(true);
    try {
      let dadosAnaliticos = null;
      if (analitico) {
        dadosAnaliticos = await api.financeiro.dreAnalitico(periodo);
      }
      await exportarDREpdf(dre, periodo, empresaAtiva, dadosAnaliticos);
    } finally {
      setExportando(false);
    }
  };

  const dreRows = dre ? [
    { label: 'Receita Bruta', valor: dre.total_receitas, tipo: 'receita', bold: true },
    ...(dre.receitas || []).map(r => ({ label: `  ${r.nome}`, valor: r.total, tipo: 'receita' })),
    { label: 'Despesas Totais', valor: dre.total_despesas, tipo: 'despesa', bold: true },
    ...(dre.despesas || []).map(d => ({ label: `  ${d.nome}`, valor: d.total, tipo: 'despesa' })),
    { label: 'RESULTADO LÍQUIDO', valor: dre.resultado, tipo: dre.resultado >= 0 ? 'positivo' : 'negativo', bold: true, destaque: true },
  ] : [];

  const barData = [
    { name: 'Receitas', valor: dre?.total_receitas || 0, fill: '#10B981' },
    { name: 'Despesas', valor: dre?.total_despesas || 0, fill: BRAND.navy },
    { name: 'Resultado', valor: dre?.resultado || 0, fill: dre?.resultado >= 0 ? BRAND.teal : '#EF4444' },
  ];

  const margem = parseFloat(dre?.margem || 0);

  return (
    <div>
      <PageHeader
        title="Relatórios Financeiros"
        subtitle="DRE — Demonstrativo de Resultado do Exercício"
      />

      {/* Filtro */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Período Início</label>
          <input className="input" type="date" value={periodo.inicio}
            onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Período Fim</label>
          <input className="input" type="date" value={periodo.fim}
            onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} />
        </div>
        <button className="btn-primary" onClick={carregar}>
          <FileText size={16} /> Gerar Relatório
        </button>
        {dre && (
          <div className="flex items-center gap-4 ml-auto">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={analitico}
                onChange={e => setAnalitico(e.target.checked)}
                className="w-4 h-4 accent-unicri-orange"
              />
              Incluir detalhamento analítico
            </label>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleExportarPDF}
              disabled={exportando}
            >
              <Download size={16} />
              {exportando ? 'Gerando PDF…' : 'Exportar PDF'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-unicri-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DRE Tabela */}
          <div className="lg:col-span-2 card">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">DRE — Demonstrativo de Resultado</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(dre?.periodo?.inicio + 'T12:00').toLocaleDateString('pt-BR')} a{' '}
                  {new Date(dre?.periodo?.fim + 'T12:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {dreRows.map((row, i) => (
                <div key={i} className={`flex items-center justify-between px-6 py-2.5 text-sm
                  ${row.destaque ? 'bg-unicri-navy text-white rounded-b-xl' : ''}
                  ${row.bold && !row.destaque ? 'bg-gray-50' : ''}`}>
                  <div className={`flex items-center gap-2 ${row.bold ? 'font-bold' : 'text-gray-600 pl-4'} ${row.destaque ? 'text-white' : ''}`}>
                    {row.tipo === 'receita' && row.bold && <TrendingUp size={14} className="text-emerald-500" />}
                    {row.tipo === 'despesa' && row.bold && <TrendingDown size={14} className="text-red-500" />}
                    {row.tipo === 'positivo' && <TrendingUp size={14} className="text-emerald-400" />}
                    {row.tipo === 'negativo' && <TrendingDown size={14} className="text-red-400" />}
                    {row.label}
                  </div>
                  <div className={`font-${row.bold ? 'bold' : 'medium'} tabular-nums
                    ${row.destaque ? 'text-white text-lg' : ''}
                    ${row.tipo === 'receita' ? 'text-emerald-600' : ''}
                    ${row.tipo === 'despesa' ? 'text-red-500' : ''}
                    ${row.tipo === 'positivo' ? 'text-emerald-400' : ''}
                    ${row.tipo === 'negativo' ? 'text-red-400' : ''}
                  `}>
                    {fmt(row.valor)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            {/* Margem */}
            <div className="card p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Margem Líquida</h3>
              <div className={`text-3xl font-black ${margem >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {margem}%
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${margem >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.abs(margem), 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {margem >= 20 ? '✅ Margem saudável' : margem >= 0 ? '⚠️ Margem baixa' : '❌ Resultado negativo'}
              </p>
            </div>

            {/* Gráfico comparativo */}
            <div className="card p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Comparativo</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {barData.map((b, i) => <Cell key={i} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Resumo */}
            <div className="card p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Resumo</h3>
              {[
                { label: 'Receita Total', value: fmt(dre?.total_receitas), color: 'text-emerald-600' },
                { label: 'Despesa Total', value: fmt(dre?.total_despesas), color: 'text-red-500' },
                { label: 'Resultado', value: fmt(dre?.resultado), color: dre?.resultado >= 0 ? 'text-unicri-navy font-bold' : 'text-red-600 font-bold' },
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
