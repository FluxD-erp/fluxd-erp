import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, BanknoteIcon, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

const TIPOS = ['CORRENTE', 'POUPANCA', 'CAIXA', 'INVESTIMENTO'];

const TIPO_LABEL = {
  CORRENTE    : 'Conta Corrente',
  POUPANCA    : 'Poupança',
  CAIXA       : 'Caixa',
  INVESTIMENTO: 'Investimento',
};

const BANCOS_BR = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '077', nome: 'Banco Inter' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '212', nome: 'Banco Original' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '260', nome: 'Nubank' },
  { codigo: '341', nome: 'Itaú' },
  { codigo: '422', nome: 'Safra' },
  { codigo: '756', nome: 'Sicoob' },
  { codigo: '748', nome: 'Sicredi' },
  { codigo: '336', nome: 'C6 Bank' },
  { codigo: '380', nome: 'PicPay' },
  { codigo: '290', nome: 'PagBank' },
];

const FORM_VAZIO = {
  nome: '', banco: '', banco_codigo: '', agencia: '',
  numero_conta: '', tipo: 'CORRENTE', saldo_inicial: '',
  ofx_bank_id: '', ofx_acct_id: '',
};

function FormConta({ conta, onSave, onClose }) {
  const editando = !!conta;
  const [form, setForm] = useState(editando ? {
    nome          : conta.nome          || '',
    banco         : conta.banco         || '',
    banco_codigo  : conta.banco_codigo  || '',
    agencia       : conta.agencia       || '',
    numero_conta  : conta.numero_conta  || '',
    tipo          : conta.tipo          || 'CORRENTE',
    saldo_inicial : conta.saldo_inicial ?? '',
    ofx_bank_id   : conta.ofx_bank_id   || '',
    ofx_acct_id   : conta.ofx_acct_id   || '',
  } : { ...FORM_VAZIO });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleBanco = (codigo) => {
    const b = BANCOS_BR.find(b => b.codigo === codigo);
    setForm(f => ({ ...f, banco_codigo: codigo, banco: b?.nome || f.banco }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome é obrigatório');
    try {
      const payload = { ...form, saldo_inicial: parseFloat(form.saldo_inicial) || 0 };
      if (editando) {
        await api.contasBancarias.atualizar(conta.id, payload);
        toast.success('Conta atualizada!');
      } else {
        await api.contasBancarias.criar(payload);
        toast.success('Conta criada!');
      }
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome / Apelido *</label>
          <input className="input" placeholder="Ex: Nubank Principal, Caixa Loja"
            value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>

        <div>
          <label className="label">Banco</label>
          <select className="input" value={form.banco_codigo} onChange={e => handleBanco(e.target.value)}>
            <option value="">Selecione ou digite abaixo</option>
            {BANCOS_BR.map(b => (
              <option key={b.codigo} value={b.codigo}>{b.codigo} — {b.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Agência</label>
          <input className="input" placeholder="0000" value={form.agencia} onChange={e => set('agencia', e.target.value)} />
        </div>

        <div>
          <label className="label">Número da Conta</label>
          <input className="input" placeholder="00000-0" value={form.numero_conta} onChange={e => set('numero_conta', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="label">Saldo Inicial (R$)</label>
          <input className="input" type="number" step="0.01" placeholder="0,00"
            value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} />
        </div>

        <div className="col-span-2 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400 mb-3">
            Dados OFX — preenchidos automaticamente ao importar extrato pela primeira vez
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">OFX Bank ID</label>
              <input className="input font-mono text-xs" placeholder="Ex: 341"
                value={form.ofx_bank_id} onChange={e => set('ofx_bank_id', e.target.value)} />
            </div>
            <div>
              <label className="label">OFX Account ID</label>
              <input className="input font-mono text-xs" placeholder="Ex: 00001234-5"
                value={form.ofx_acct_id} onChange={e => set('ofx_acct_id', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{editando ? 'Salvar' : 'Criar Conta'}</button>
      </div>
    </form>
  );
}

export default function ContasBancarias() {
  const [contas, setContas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await api.contasBancarias.listar();
      setContas(data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const excluir = async (id) => {
    if (!confirm('Desativar esta conta bancária?')) return;
    try {
      await api.contasBancarias.excluir(id);
      toast.success('Conta desativada.');
      carregar();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Contas Bancárias"
        subtitle="Gerencie suas contas para vincular extratos OFX e lançamentos"
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nova Conta
          </button>
        }
      />

      {loading ? (
        <div className="card p-10 text-center text-gray-400">Carregando...</div>
      ) : contas.length === 0 ? (
        <div className="card p-16 text-center border-2 border-dashed border-gray-200">
          <BanknoteIcon size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma conta bancária cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Crie sua primeira conta para vincular extratos OFX</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Cadastrar Conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map(conta => (
            <div key={conta.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-unicri-orange/10 flex items-center justify-center shrink-0">
                    {conta.tipo === 'CAIXA'
                      ? <Wallet size={20} className="text-unicri-orange" />
                      : <BanknoteIcon size={20} className="text-unicri-orange" />}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{conta.nome}</div>
                    <div className="text-xs text-gray-400">{conta.banco || 'Banco não informado'}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditando(conta)}
                    className="text-gray-300 hover:text-unicri-orange transition-colors p-1" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => excluir(conta.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1" title="Desativar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span className="text-gray-400">Tipo</span>
                  <div className="font-medium text-gray-700">{TIPO_LABEL[conta.tipo] || conta.tipo}</div>
                </div>
                {conta.agencia && (
                  <div>
                    <span className="text-gray-400">Agência</span>
                    <div className="font-medium text-gray-700">{conta.agencia}</div>
                  </div>
                )}
                {conta.numero_conta && (
                  <div>
                    <span className="text-gray-400">Conta</span>
                    <div className="font-medium text-gray-700">{conta.numero_conta}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Saldo inicial</span>
                  <div className="font-semibold text-unicri-orange">{fmt(conta.saldo_inicial)}</div>
                </div>
              </div>

              {(conta.ofx_bank_id || conta.ofx_acct_id) && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                  <BanknoteIcon size={11} />
                  OFX vinculado — reconhecimento automático ativo
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta Bancária" size="lg">
        <FormConta onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); carregar(); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Conta Bancária" size="lg">
        <FormConta conta={editando} onClose={() => setEditando(null)} onSave={() => { setEditando(null); carregar(); }} />
      </Modal>
    </div>
  );
}
