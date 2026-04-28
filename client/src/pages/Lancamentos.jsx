import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

function FormLancamento({ onSave, onClose, clientes, fornecedores, planoContas }) {
  const [form, setForm] = useState({
    tipo: 'RECEITA', descricao: '', valor: '',
    data_competencia: new Date().toISOString().split('T')[0],
    data_pagamento: '', status: 'PENDENTE',
    conta_id: '', cliente_id: '', fornecedor_id: '',
    numero_documento: '', observacao: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data_competencia)
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      await api.financeiro.criarLancamento({ ...form, valor: parseFloat(form.valor) });
      toast.success('Lançamento criado!');
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Tipo *</label>
          <div className="flex gap-3">
            {['RECEITA', 'DESPESA', 'TRANSFERENCIA'].map(t => (
              <label key={t} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors text-sm font-medium flex-1 justify-center
                ${form.tipo === t ? 'border-unicri-orange bg-unicri-orange/5 text-unicri-orange' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                <input type="radio" className="sr-only" value={t} checked={form.tipo === t} onChange={() => set('tipo', t)} />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label">Descrição *</label>
          <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
        </div>
        <div>
          <label className="label">Valor (R$) *</label>
          <input className="input" type="number" step="0.01" min="0.01"
            value={form.valor} onChange={e => set('valor', e.target.value)} required />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {['PENDENTE','PAGO','CANCELADO'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data Competência *</label>
          <input className="input" type="date" value={form.data_competencia}
            onChange={e => set('data_competencia', e.target.value)} required />
        </div>
        <div>
          <label className="label">Data Pagamento</label>
          <input className="input" type="date" value={form.data_pagamento}
            onChange={e => set('data_pagamento', e.target.value)} />
        </div>
        {form.tipo === 'RECEITA' && (
          <div className="col-span-2">
            <label className="label">Cliente</label>
            <select className="input" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Nenhum</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        {form.tipo === 'DESPESA' && (
          <div className="col-span-2">
            <label className="label">Fornecedor</label>
            <select className="input" value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)}>
              <option value="">Nenhum</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Conta Contábil</label>
          <select className="input" value={form.conta_id} onChange={e => set('conta_id', e.target.value)}>
            <option value="">Nenhuma</option>
            {planoContas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Nº Documento</label>
          <input className="input" value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} />
        </div>
        <div>
          <label className="label">Observação</label>
          <input className="input" value={form.observacao} onChange={e => set('observacao', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">Salvar Lançamento</button>
      </div>
    </form>
  );
}

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({ tipo: '', status: '', search: '' });

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.status) params.status = filtros.status;
    if (filtros.search) params.search = filtros.search;
    const [l, c, f, p] = await Promise.all([
      api.financeiro.lancamentos(params),
      api.clientes.listar({ ativo: 'true' }),
      api.fornecedores.listar({ ativo: 'true' }),
      api.financeiro.planoContas(),
    ]);
    setLancamentos(l); setClientes(c); setFornecedores(f); setPlanoContas(p);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filtros]);

  const totalReceitas = lancamentos.filter(l => l.tipo === 'RECEITA' && l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === 'DESPESA' && l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);

  return (
    <div>
      <PageHeader
        title="Lançamentos"
        subtitle="Registro de todas as movimentações financeiras"
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Novo Lançamento
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Total Receitas (pagos)</div>
          <div className="text-xl font-bold text-emerald-600">{fmt(totalReceitas)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Total Despesas (pagas)</div>
          <div className="text-xl font-bold text-red-500">{fmt(totalDespesas)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Resultado</div>
          <div className={`text-xl font-bold ${totalReceitas - totalDespesas >= 0 ? 'text-unicri-orange' : 'text-red-600'}`}>
            {fmt(totalReceitas - totalDespesas)}
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Buscar descrição..."
            value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select className="input w-auto" value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}>
          {['', 'RECEITA', 'DESPESA', 'TRANSFERENCIA'].map(t => <option key={t} value={t}>{t || 'Todos os tipos'}</option>)}
        </select>
        <select className="input w-auto" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          {['', 'PENDENTE', 'PAGO', 'CANCELADO'].map(s => <option key={s} value={s}>{s || 'Todos os status'}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Conta</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : lancamentos.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
            ) : lancamentos.map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{l.descricao}</td>
                <td className="px-5 py-3">
                  <span className={l.tipo === 'RECEITA' ? 'badge-receita' : 'badge-despesa'}>{l.tipo}</span>
                </td>
                <td className="px-5 py-3 text-gray-500">{fmtData(l.data_competencia)}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{l.conta_nome || '—'}</td>
                <td className={`px-5 py-3 text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {l.tipo !== 'RECEITA' ? '−' : '+'}{fmt(l.valor)}
                </td>
                <td className="px-5 py-3">
                  <span className={l.status === 'PAGO' ? 'badge-pago' : l.status === 'PENDENTE' ? 'badge-pendente' : 'badge-cancelado'}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Lançamento" size="lg">
        <FormLancamento
          clientes={clientes} fornecedores={fornecedores} planoContas={planoContas}
          onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); carregar(); }}
        />
      </Modal>
    </div>
  );
}
