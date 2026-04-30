import { useEffect, useState } from 'react';
import { Plus, Search, CheckCircle, Repeat, Layers, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

const FREQUENCIAS = ['SEMANAL','QUINZENAL','MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL'];

function StatusBadge({ status }) {
  const map = {
    ABERTA: 'badge-pendente', RECEBIDA: 'badge-pago', VENCIDA: 'badge-vencido',
    PARCIAL: 'badge-parcial', CANCELADA: 'badge-cancelado',
  };
  return <span className={map[status] || 'badge-pendente'}>{status}</span>;
}

function FormConta({ onSave, onClose, clientes, planoContas, conta }) {
  const editando = !!conta;
  const [form, setForm] = useState({
    cliente_id     : conta?.cliente_id      || '',
    descricao      : conta?.descricao       || '',
    valor_original : conta?.valor_original  || '',
    data_emissao   : conta?.data_emissao    || new Date().toISOString().split('T')[0],
    data_vencimento: conta?.data_vencimento || '',
    numero_documento: conta?.numero_documento || '',
    observacao     : conta?.observacao      || '',
    conta_id       : conta?.conta_id        || '',
  });
  const [modo, setModo] = useState('simples');
  const [numParcelas, setNumParcelas] = useState('2');
  const [frequencia, setFrequencia] = useState('MENSAL');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.descricao || !form.valor_original || !form.data_vencimento)
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      if (editando) {
        await api.financeiro.atualizarContaReceber(conta.id, {
          ...form, valor_original: parseFloat(form.valor_original),
        });
        toast.success('Conta atualizada!');
      } else {
        const payload = {
          ...form,
          valor_original: parseFloat(form.valor_original),
          parcelado   : modo === 'parcelado',
          recorrente  : modo === 'recorrente',
          num_parcelas: modo === 'parcelado' ? parseInt(numParcelas) : 1,
          frequencia  : modo !== 'simples' ? frequencia : null,
        };
        const res = await api.financeiro.criarContaReceber(payload);
        if (res?.parcelas) {
          toast.success(`${res.parcelas} parcelas cadastradas!`);
        } else {
          toast.success(modo === 'recorrente' ? 'Conta recorrente cadastrada!' : 'Conta a receber cadastrada!');
        }
      }
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo — só no cadastro */}
      {!editando && <div className="flex gap-2">
        {[
          { val: 'simples',    label: 'Simples' },
          { val: 'parcelado',  label: 'Parcelado' },
          { val: 'recorrente', label: 'Recorrente' },
        ].map(o => (
          <button key={o.val} type="button"
            onClick={() => setModo(o.val)}
            className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors font-medium
              ${modo === o.val
                ? 'bg-unicri-navy text-white border-unicri-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-unicri-navy/40'}`}>
            {o.val === 'parcelado'  && <Layers size={13} className="inline mr-1" />}
            {o.val === 'recorrente' && <Repeat size={13} className="inline mr-1" />}
            {o.label}
          </button>
        ))}
      </div>}

      {/* Opções de parcelamento / recorrência — só no cadastro */}
      {!editando && modo === 'parcelado' && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-xl">
          <div>
            <label className="label">Nº de Parcelas *</label>
            <input className="input" type="number" min="2" max="360" value={numParcelas}
              onChange={e => setNumParcelas(e.target.value)} />
          </div>
          <div>
            <label className="label">Frequência *</label>
            <select className="input" value={frequencia} onChange={e => setFrequencia(e.target.value)}>
              {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="col-span-2 text-xs text-blue-700">
            Serão criadas <strong>{numParcelas || '?'}</strong> parcelas de&nbsp;
            <strong>{form.valor_original ? fmt(parseFloat(form.valor_original) / (parseInt(numParcelas) || 1)) : 'R$ —'}</strong> cada, vencendo a cada {frequencia.toLowerCase()}.
          </div>
        </div>
      )}
      {!editando && modo === 'recorrente' && (
        <div className="p-3 bg-amber-50 rounded-xl">
          <label className="label">Frequência de repetição *</label>
          <select className="input" value={frequencia} onChange={e => setFrequencia(e.target.value)}>
            {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="text-xs text-amber-700 mt-2">Ao quitar esta conta, a próxima ocorrência é gerada automaticamente.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Cliente *</label>
          <select className="input" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} required>
            <option value="">Selecione...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição *</label>
          <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
        </div>
        <div>
          <label className="label">Valor {modo === 'parcelado' ? 'Total' : ''} (R$) *</label>
          <input className="input" type="number" step="0.01" min="0.01" value={form.valor_original}
            onChange={e => set('valor_original', e.target.value)} required />
        </div>
        <div>
          <label className="label">Nº Documento</label>
          <input className="input" value={form.numero_documento} onChange={e => set('numero_documento', e.target.value)} />
        </div>
        <div>
          <label className="label">Data Emissão *</label>
          <input className="input" type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} required />
        </div>
        <div>
          <label className="label">{modo === 'parcelado' ? 'Venc. 1ª Parcela *' : 'Data Vencimento *'}</label>
          <input className="input" type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Conta Contábil</label>
          <select className="input" value={form.conta_id} onChange={e => set('conta_id', e.target.value)}>
            <option value="">Nenhuma</option>
            {planoContas.filter(c => c.tipo === 'RECEITA').map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observação</label>
          <textarea className="input" rows={2} value={form.observacao} onChange={e => set('observacao', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">
          {editando ? 'Salvar Alterações' : modo === 'parcelado' ? `Criar ${numParcelas || '?'} Parcelas` : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function ModalReceber({ conta, onClose, onSave }) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const restante = (conta?.valor_original || 0) - (conta?.valor_recebido || 0);

  const handle = async () => {
    const v = parseFloat(valor);
    if (!v || v <= 0) return toast.error('Informe o valor recebido');
    try {
      await api.financeiro.receberConta(conta.id, { valor_recebido: v, data_recebimento: data });
      toast.success('Recebimento registrado!');
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Modal open={!!conta} onClose={onClose} title="Registrar Recebimento" size="sm">
      {conta && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="font-semibold text-gray-800">{conta.descricao}</div>
            <div className="text-gray-500">Cliente: {conta.cliente_nome}</div>
            <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
              <span className="text-gray-500">Valor original</span>
              <span className="font-semibold">{fmt(conta.valor_original)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Já recebido</span>
              <span className="font-semibold text-emerald-600">{fmt(conta.valor_recebido)}</span>
            </div>
            <div className="flex justify-between font-bold text-unicri-orange">
              <span>Restante</span><span>{fmt(restante)}</span>
            </div>
          </div>
          <div>
            <label className="label">Valor recebido (R$) *</label>
            <input className="input" type="number" step="0.01" min="0.01" max={restante}
              value={valor} onChange={e => setValor(e.target.value)} placeholder={fmt(restante)} />
          </div>
          <div>
            <label className="label">Data do recebimento *</label>
            <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handle}>
              <CheckCircle size={16} /> Confirmar Recebimento
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editando, setEditando]   = useState(null);
  const [recebendo, setRecebendo] = useState(null);
  const [filtros, setFiltros] = useState({ status: '', search: '' });

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.search) params.search = filtros.search;
    const [c, cl, p] = await Promise.all([
      api.financeiro.contasReceber(params),
      api.clientes.listar({ ativo: 'true' }),
      api.financeiro.planoContas(),
    ]);
    setContas(c); setClientes(cl); setPlanoContas(p);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filtros]);

  const totalAberto = contas.filter(c => ['ABERTA','PARCIAL'].includes(c.status)).reduce((s, c) => s + c.valor_original - c.valor_recebido, 0);
  const totalVencido = contas.filter(c => c.status === 'VENCIDA').reduce((s, c) => s + c.valor_original - c.valor_recebido, 0);

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        subtitle="Acompanhe seus recebimentos"
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Conta
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total a Receber', value: fmt(totalAberto), color: 'text-unicri-orange' },
          { label: 'Em Atraso', value: fmt(totalVencido), color: 'text-red-600' },
          { label: 'Contas Abertas', value: contas.filter(c => c.status === 'ABERTA').length, color: 'text-gray-800' },
          { label: 'Vencidas', value: contas.filter(c => c.status === 'VENCIDA').length, color: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="card p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Buscar por descrição ou cliente..."
            value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select className="input w-auto" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          {['', 'ABERTA', 'RECEBIDA', 'VENCIDA', 'PARCIAL', 'CANCELADA'].map(s =>
            <option key={s} value={s}>{s || 'Todos os status'}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Vencimento</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-right">Recebido</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : contas.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Nenhuma conta encontrada</td></tr>
            ) : contas.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${c.status === 'VENCIDA' ? 'bg-red-50/30' : ''}`}>
                <td className="px-5 py-3 font-medium text-gray-800 max-w-xs">
                  <div className="truncate flex items-center gap-1.5">
                    {c.recorrente && <Repeat size={12} className="text-amber-500 shrink-0" title="Recorrente" />}
                    {c.parcelado  && <Layers size={12} className="text-blue-500 shrink-0" title={`Parcela ${c.parcela_atual}/${c.num_parcelas}`} />}
                    <span>{c.descricao}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                    {c.numero_documento && <span>Doc: {c.numero_documento}</span>}
                    {c.parcelado && <span className="text-blue-500 font-medium">{c.parcela_atual}/{c.num_parcelas}</span>}
                    {c.recorrente && <span className="text-amber-500 font-medium">{c.frequencia}</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{c.cliente_nome}</td>
                <td className={`px-5 py-3 ${c.status === 'VENCIDA' ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {fmtData(c.data_vencimento)}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{fmt(c.valor_original)}</td>
                <td className="px-5 py-3 text-right text-emerald-600">{fmt(c.valor_recebido)}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {['ABERTA','PARCIAL','VENCIDA'].includes(c.status) && (
                      <button className="btn-primary py-1 px-3 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => setRecebendo(c)}>
                        <CheckCircle size={13} /> Receber
                      </button>
                    )}
                    {c.status !== 'CANCELADA' && (
                      <>
                        <button onClick={() => setEditando(c)}
                          className="text-gray-300 hover:text-unicri-orange transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={async () => {
                            if (!confirm('Cancelar esta conta?')) return;
                            try {
                              await api.financeiro.atualizarContaReceber(c.id, { ...c, status: 'CANCELADA' });
                              toast.success('Conta cancelada');
                              carregar();
                            } catch (e) { toast.error(e.message); }
                          }}
                          className="text-gray-300 hover:text-red-400 transition-colors" title="Cancelar">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta a Receber">
        <FormConta clientes={clientes} planoContas={planoContas}
          onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); carregar(); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Conta a Receber">
        <FormConta clientes={clientes} planoContas={planoContas}
          conta={editando}
          onClose={() => setEditando(null)} onSave={() => { setEditando(null); carregar(); }} />
      </Modal>

      <ModalReceber conta={recebendo} onClose={() => setRecebendo(null)} onSave={() => { setRecebendo(null); carregar(); }} />
    </div>
  );
}
