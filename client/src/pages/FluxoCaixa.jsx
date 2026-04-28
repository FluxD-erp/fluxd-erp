import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function FluxoCaixa() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(() => {
    const hoje = new Date();
    return {
      inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
      fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  });

  const carregar = async () => {
    setLoading(true);
    const data = await api.financeiro.fluxoCaixa(periodo);
    setDados(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [periodo]);

  const totalEntradas = dados?.movimentos.filter(m => m.tipo === 'RECEITA' && m.status === 'PAGO').reduce((s, m) => s + m.valor, 0) || 0;
  const totalSaidas = dados?.movimentos.filter(m => m.tipo === 'DESPESA' && m.status === 'PAGO').reduce((s, m) => s + m.valor, 0) || 0;

  const chartData = dados?.movimentos.reduce((acc, m) => {
    const d = m.data;
    const existing = acc.find(a => a.data === d);
    if (existing) {
      existing.saldo = m.saldo_acumulado;
    } else {
      acc.push({ data: fmtData(d), saldo: m.saldo_acumulado });
    }
    return acc;
  }, []) || [];

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" subtitle="Acompanhe a movimentação diária de caixa" />

      {/* Filtro período */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Data Início</label>
          <input className="input" type="date" value={periodo.inicio}
            onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Data Fim</label>
          <input className="input" type="date" value={periodo.fim}
            onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} />
        </div>
        <button className="btn-primary" onClick={carregar}>Atualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Saldo Anterior', value: fmt(dados?.saldo_anterior), color: 'text-unicri-navy' },
          { label: 'Total Entradas', value: fmt(totalEntradas), color: 'text-emerald-600' },
          { label: 'Total Saídas', value: fmt(totalSaidas), color: 'text-red-500' },
          { label: 'Saldo Final', value: fmt((dados?.saldo_anterior || 0) + totalEntradas - totalSaidas), color: 'text-unicri-orange font-bold' },
        ].map((k, i) => (
          <div key={i} className="card p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Evolução do Saldo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Data: ${l}`} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#1E3A5F"
                fill="url(#gradSaldo)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Movimentos */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Movimentos do Período</h2>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dados?.movimentos.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhuma movimentação no período</td></tr>
              ) : dados?.movimentos.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-2.5 text-gray-500">{fmtData(m.data)}</td>
                  <td className="px-5 py-2.5 text-gray-800 max-w-xs truncate">{m.descricao}</td>
                  <td className="px-5 py-2.5">
                    <span className={m.tipo === 'RECEITA' ? 'badge-receita' : 'badge-despesa'}>{m.tipo}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={m.status === 'PAGO' ? 'badge-pago' : 'badge-pendente'}>{m.status}</span>
                  </td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${m.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.tipo === 'RECEITA' ? '+' : '−'}{fmt(m.valor)}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-bold ${m.saldo_acumulado >= 0 ? 'text-unicri-navy' : 'text-red-600'}`}>
                    {fmt(m.saldo_acumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
