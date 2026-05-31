import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, BanknoteIcon, Wallet, Zap, RefreshCw, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
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

// ── Modal credenciais Inter ──────────────────────────────────────
function ModalInterCredenciais({ conta, onClose, onSave }) {
  const [form, setForm] = useState({
    inter_client_id    : conta?.inter_client_id     || '',
    inter_client_secret: conta?.inter_client_secret || '',
    inter_cert_pem     : conta?.inter_cert_pem      || '',
    inter_key_pem      : conta?.inter_key_pem       || '',
  });
  const [loading, setLoading] = useState(false);
  const certRef = useRef();
  const keyRef  = useRef();

  const lerArquivo = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsText(file);
  });

  const handleCert = async (e) => {
    const texto = await lerArquivo(e.target.files[0]);
    setForm(f => ({ ...f, inter_cert_pem: texto }));
  };
  const handleKey = async (e) => {
    const texto = await lerArquivo(e.target.files[0]);
    setForm(f => ({ ...f, inter_key_pem: texto }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.inter_client_id || !form.inter_client_secret || !form.inter_cert_pem || !form.inter_key_pem)
      return toast.error('Preencha todos os campos e faça upload dos arquivos');
    setLoading(true);
    try {
      await api.inter.salvarCredenciais(conta.id, form);
      toast.success('Credenciais salvas! Testando conexão…');
      const status = await api.inter.status(conta.id);
      if (status.conectado) toast.success('✅ Conexão com Inter confirmada!');
      else toast.error('Credenciais salvas mas conexão falhou: ' + (status.erro || 'verifique os dados'));
      onSave();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={!!conta} onClose={onClose} title={`API Inter — ${conta?.nome}`} size="lg">
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Como obter as credenciais:</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Acesse <strong>inter.co/empresas → Conta Digital → API Banking</strong></li>
            <li>Clique em <strong>Nova Integração</strong></li>
            <li>Selecione o escopo <strong>extrato.read</strong></li>
            <li>Baixe o <strong>certificado (.crt)</strong> e a <strong>chave privada (.key)</strong></li>
            <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong></li>
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client ID *</label>
            <input className="input font-mono text-xs" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={form.inter_client_id} onChange={e => setForm(f => ({ ...f, inter_client_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Client Secret *</label>
            <input className="input font-mono text-xs" type="password" placeholder="••••••••••••••••"
              value={form.inter_client_secret} onChange={e => setForm(f => ({ ...f, inter_client_secret: e.target.value }))} />
          </div>

          <div>
            <label className="label">Certificado (.crt) *</label>
            <div
              className={`border-2 border-dashed rounded-xl px-3 py-3 text-center cursor-pointer transition-colors text-xs
                ${form.inter_cert_pem ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-unicri-orange/40 text-gray-400'}`}
              onClick={() => certRef.current?.click()}
            >
              {form.inter_cert_pem
                ? <span className="flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Certificado carregado</span>
                : 'Clique para selecionar .crt'}
              <input ref={certRef} type="file" accept=".crt,.pem" className="hidden" onChange={handleCert} />
            </div>
          </div>

          <div>
            <label className="label">Chave Privada (.key) *</label>
            <div
              className={`border-2 border-dashed rounded-xl px-3 py-3 text-center cursor-pointer transition-colors text-xs
                ${form.inter_key_pem ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-unicri-orange/40 text-gray-400'}`}
              onClick={() => keyRef.current?.click()}
            >
              {form.inter_key_pem
                ? <span className="flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Chave carregada</span>
                : 'Clique para selecionar .key'}
              <input ref={keyRef} type="file" accept=".key,.pem" className="hidden" onChange={handleKey} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando e testando…' : 'Salvar e Testar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal extrato Inter ──────────────────────────────────────────
function ModalExtratoInter({ conta, onClose }) {
  const navigate = useNavigate();
  const hoje  = new Date().toISOString().split('T')[0];
  const h30   = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [inicio, setInicio] = useState(h30);
  const [fim, setFim]       = useState(hoje);
  const [trns, setTrns]     = useState(null);
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);
    try {
      const res = await api.inter.extrato(conta.id, inicio, fim);
      setTrns(res);
      if (!res.transacoes?.length) toast.error('Nenhuma transação no período');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const irConciliacao = () => {
    onClose();
    navigate('/conciliacao');
  };

  return (
    <Modal open={!!conta} onClose={onClose} title={`Extrato Inter — ${conta?.nome}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">De</label>
            <input className="input" type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">Até</label>
            <input className="input" type="date" value={fim} onChange={e => setFim(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={buscar} disabled={loading}>
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {trns && (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5">
              <span>{trns.transacoes.length} transações encontradas</span>
              {trns.saldo !== null && <span>Saldo disponível: <strong className="text-gray-800">{fmt(trns.saldo)}</strong></span>}
            </div>

            <div className="overflow-x-auto max-h-64 border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-400 uppercase tracking-wide">
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {trns.transacoes.map((t, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-medium text-gray-700 max-w-[200px] truncate">{t.memo}</td>
                      <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{fmtData(t.date)}</td>
                      <td className="px-3 py-1.5">
                        <span className={t.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}>
                          {t.tipo === 'RECEITA' ? '+ Crédito' : '− Débito'}
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 text-right font-semibold ${t.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={onClose}>Fechar</button>
              <button className="btn-primary" onClick={irConciliacao}>
                <Download size={15} /> Ir para Conciliação
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────
export default function ContasBancarias() {
  const [contas, setContas]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editando, setEditando]     = useState(null);
  const [interCred, setInterCred]   = useState(null); // conta para configurar Inter
  const [interExtrato, setInterExt] = useState(null); // conta para buscar extrato

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

              {(conta.ofx_bank_id || conta.ofx_acct_id) && !conta.inter_client_id && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                  <BanknoteIcon size={11} />
                  OFX vinculado — reconhecimento automático ativo
                </div>
              )}

              {/* Botões API Inter */}
              <div className="flex gap-2 mt-1">
                {conta.inter_client_id ? (
                  <button
                    onClick={() => setInterExt(conta)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-unicri-orange hover:bg-unicri-orange-dark rounded-lg px-3 py-1.5 transition-colors">
                    <RefreshCw size={11} /> Buscar Extrato Inter
                  </button>
                ) : (
                  <button
                    onClick={() => setInterCred(conta)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-unicri-orange border border-unicri-orange/30 hover:bg-unicri-orange/5 rounded-lg px-3 py-1.5 transition-colors">
                    <Zap size={11} /> Conectar API Inter
                  </button>
                )}
                {conta.inter_client_id && (
                  <button onClick={() => setInterCred(conta)}
                    className="text-gray-300 hover:text-gray-500 p-1.5" title="Reconfigurar credenciais">
                    <Zap size={13} />
                  </button>
                )}
              </div>
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

      {interCred && (
        <ModalInterCredenciais
          conta={interCred}
          onClose={() => setInterCred(null)}
          onSave={() => { setInterCred(null); carregar(); }}
        />
      )}

      {interExtrato && (
        <ModalExtratoInter
          conta={interExtrato}
          onClose={() => setInterExt(null)}
        />
      )}
    </div>
  );
}
