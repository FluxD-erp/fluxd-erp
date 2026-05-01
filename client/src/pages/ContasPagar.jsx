import { useEffect, useState, useRef } from 'react';
import { Plus, Search, CheckCircle, Repeat, Layers, Pencil, Trash2, FileInput, Upload, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { parseNFe } from '../lib/nfeParser';

const STATUS_OPTIONS = ['', 'ABERTA', 'PAGA', 'VENCIDA', 'PARCIAL', 'CANCELADA'];
const FREQUENCIAS = ['SEMANAL','QUINZENAL','MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL'];

function StatusBadge({ status }) {
  const map = {
    ABERTA: 'badge-pendente', PAGA: 'badge-pago', VENCIDA: 'badge-vencido',
    PARCIAL: 'badge-parcial', CANCELADA: 'badge-cancelado',
  };
  return <span className={map[status] || 'badge-pendente'}>{status}</span>;
}

function FormConta({ onSave, onClose, fornecedores, planoContas, conta }) {
  const editando = !!conta;
  const [form, setForm] = useState({
    fornecedor_id  : conta?.fornecedor_id   || '',
    descricao      : conta?.descricao       || '',
    valor_original : conta?.valor_original  || '',
    data_emissao   : conta?.data_emissao    || new Date().toISOString().split('T')[0],
    data_vencimento: conta?.data_vencimento || '',
    numero_documento: conta?.numero_documento || '',
    observacao     : conta?.observacao      || '',
    conta_id       : conta?.conta_id        || '',
  });
  const [modo, setModo] = useState('simples'); // 'simples' | 'parcelado' | 'recorrente' (só no cadastro)
  const [numParcelas, setNumParcelas] = useState('2');
  const [frequencia, setFrequencia] = useState('MENSAL');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fornecedor_id || !form.descricao || !form.valor_original || !form.data_vencimento)
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      if (editando) {
        await api.financeiro.atualizarContaPagar(conta.id, {
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
        const res = await api.financeiro.criarContaPagar(payload);
        if (res?.parcelas) {
          toast.success(`${res.parcelas} parcelas cadastradas!`);
        } else {
          toast.success(modo === 'recorrente' ? 'Conta recorrente cadastrada!' : 'Conta a pagar cadastrada!');
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
          <label className="label">Fornecedor *</label>
          <select className="input" value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)} required>
            <option value="">Selecione...</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição *</label>
          <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
        </div>
        <div>
          <label className="label">Valor {modo === 'parcelado' ? 'Total' : 'Original'} (R$) *</label>
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
            {planoContas.filter(c => c.tipo === 'DESPESA').map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
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
          {editando ? 'Salvar Alterações' : modo === 'parcelado' ? `Criar ${numParcelas || '?'} Parcelas` : 'Salvar Conta'}
        </button>
      </div>
    </form>
  );
}

function ModalPagar({ conta, onClose, onSave }) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const restante = (conta?.valor_original || 0) - (conta?.valor_pago || 0);

  const handlePagar = async () => {
    const v = parseFloat(valor);
    if (!v || v <= 0) return toast.error('Informe o valor pago');
    if (v > restante) return toast.error(`Valor máximo: ${fmt(restante)}`);
    try {
      await api.financeiro.pagarConta(conta.id, { valor_pago: v, data_pagamento: data });
      toast.success('Pagamento registrado!');
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Modal open={!!conta} onClose={onClose} title="Registrar Pagamento" size="sm">
      {conta && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="font-semibold text-gray-800">{conta.descricao}</div>
            <div className="text-gray-500">Fornecedor: {conta.fornecedor_nome}</div>
            <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
              <span className="text-gray-500">Valor original</span>
              <span className="font-semibold">{fmt(conta.valor_original)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Já pago</span>
              <span className="font-semibold text-emerald-600">{fmt(conta.valor_pago)}</span>
            </div>
            <div className="flex justify-between font-bold text-unicri-orange">
              <span>Restante</span>
              <span>{fmt(restante)}</span>
            </div>
          </div>
          <div>
            <label className="label">Valor a pagar (R$) *</label>
            <input className="input" type="number" step="0.01" min="0.01" max={restante}
              value={valor} onChange={e => setValor(e.target.value)} placeholder={fmt(restante)} />
          </div>
          <div>
            <label className="label">Data do pagamento *</label>
            <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={handlePagar}>
              <CheckCircle size={16} /> Confirmar Pagamento
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Modal Importar NF via XML ────────────────────────────────────
function ModalImportarNF({ open, onClose, fornecedores, planoContas, onSave }) {
  const inputRef                  = useRef();
  const [nfData, setNfData]       = useState(null);   // resultado do parseNFe
  const [fornId, setFornId]       = useState('');     // fornecedor selecionado
  const [contaId, setContaId]     = useState('');     // conta contábil
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');

  const reset = () => { setNfData(null); setFornId(''); setContaId(''); setErro(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.xml$/i)) return setErro('Arquivo deve ser .xml');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseNFe(e.target.result);
      if (result.erro) { setErro(result.erro); return; }
      setErro('');
      setNfData(result);
      // Tenta match automático por CNPJ
      const match = fornecedores.find(f =>
        f.cpf_cnpj?.replace(/\D/g, '') === result.emitente.cnpj
      );
      if (match) setFornId(match.id);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImportar = async () => {
    if (!nfData) return;
    setLoading(true);
    try {
      const payload = {
        fornecedor_id  : fornId || null,
        fornecedor_novo: !fornId ? { nome: nfData.emitente.razao_social, cnpj: nfData.emitente.cnpj_fmt } : null,
        nf             : nfData.nf,
        duplicatas     : nfData.duplicatas,
        conta_id       : contaId || null,
      };
      const res = await api.financeiro.importarNF(payload);
      toast.success(`${res.importadas} duplicata(s) importada(s) como contas a pagar!`);
      reset();
      onSave();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar NF via XML" size="lg">
      <div className="space-y-4">

        {/* Upload */}
        {!nfData ? (
          <>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-unicri-orange/40 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <Upload size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                Arraste o XML da NFe ou{' '}
                <span className="text-unicri-orange font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Arquivo .xml exportado do SysDh ou pasta de XMLs</p>
              <input ref={inputRef} type="file" accept=".xml" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
            </div>
            {erro && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="shrink-0" /> {erro}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Resumo da NF */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 text-base">NF {nfData.nf.numero}/{nfData.nf.serie}</span>
                <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-600">
                <div><span className="text-gray-400">Emitente:</span> {nfData.emitente.razao_social}</div>
                <div><span className="text-gray-400">CNPJ:</span> {nfData.emitente.cnpj_fmt}</div>
                <div><span className="text-gray-400">Emissão:</span> {fmtData(nfData.nf.data_emissao)}</div>
                <div><span className="text-gray-400">Valor total:</span> <strong>{fmt(nfData.nf.valor_total)}</strong></div>
              </div>
            </div>

            {/* Duplicatas */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                {nfData.duplicatas.length} duplicata(s) encontrada(s)
                {nfData.duplicatas[0]?.avista && <span className="ml-2 text-amber-600">(pagamento à vista)</span>}
              </p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2">Duplicata</th>
                      <th className="px-4 py-2">Vencimento</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {nfData.duplicatas.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium text-gray-700">{d.numero}</td>
                        <td className="px-4 py-2 text-gray-500">{fmtData(d.vencimento)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-500">{fmt(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fornecedor */}
            <div>
              <label className="label">
                Fornecedor *
                {!fornId && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">
                    CNPJ não encontrado — será criado automaticamente
                  </span>
                )}
              </label>
              <select className="input" value={fornId} onChange={e => setFornId(e.target.value)}>
                <option value="">Criar novo: {nfData.emitente.razao_social}</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            {/* Conta contábil */}
            <div>
              <label className="label">Conta Contábil</label>
              <select className="input" value={contaId} onChange={e => setContaId(e.target.value)}>
                <option value="">Nenhuma</option>
                {planoContas.filter(c => c.tipo === 'DESPESA').map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-secondary" onClick={handleClose}>Cancelar</button>
              <button className="btn-primary" onClick={handleImportar} disabled={loading}>
                {loading ? 'Importando…' : `Importar ${nfData.duplicatas.length} duplicata(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function ContasPagar() {
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [pagando, setPagando]   = useState(null);
  const [showImportNF, setShowImportNF] = useState(false);
  const [filtros, setFiltros] = useState({ status: '', search: '' });

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.search) params.search = filtros.search;
    const [c, f, p] = await Promise.all([
      api.financeiro.contasPagar(params),
      api.fornecedores.listar({ ativo: 'true' }),
      api.financeiro.planoContas(),
    ]);
    setContas(c); setFornecedores(f); setPlanoContas(p);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filtros]);

  const totalAberto = contas.filter(c => ['ABERTA','PARCIAL'].includes(c.status)).reduce((s, c) => s + c.valor_original - c.valor_pago, 0);
  const totalVencido = contas.filter(c => c.status === 'VENCIDA').reduce((s, c) => s + c.valor_original - c.valor_pago, 0);

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Gerencie seus compromissos financeiros"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowImportNF(true)}>
              <FileInput size={16} /> Importar NF
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Nova Conta
            </button>
          </div>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total em Aberto', value: fmt(totalAberto), color: 'text-yellow-600' },
          { label: 'Total Vencido', value: fmt(totalVencido), color: 'text-red-600' },
          { label: 'Contas Abertas', value: contas.filter(c => c.status === 'ABERTA').length, color: 'text-gray-800' },
          { label: 'Vencidas', value: contas.filter(c => c.status === 'VENCIDA').length, color: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="card p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Buscar descrição ou fornecedor..."
            value={filtros.search} onChange={e => setFiltros(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select className="input w-auto" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Todos os status'}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3">Fornecedor</th>
              <th className="px-5 py-3">Vencimento</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-right">Pago</th>
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
                <td className="px-5 py-3 text-gray-600">{c.fornecedor_nome}</td>
                <td className={`px-5 py-3 ${c.status === 'VENCIDA' ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {fmtData(c.data_vencimento)}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{fmt(c.valor_original)}</td>
                <td className="px-5 py-3 text-right text-emerald-600">{fmt(c.valor_pago)}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {['ABERTA','PARCIAL','VENCIDA'].includes(c.status) && (
                      <button className="btn-primary py-1 px-3 text-xs" onClick={() => setPagando(c)}>
                        <CheckCircle size={13} /> Pagar
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
                              await api.financeiro.atualizarContaPagar(c.id, { ...c, status: 'CANCELADA' });
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta a Pagar">
        <FormConta
          fornecedores={fornecedores} planoContas={planoContas}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); carregar(); }}
        />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Conta a Pagar">
        <FormConta
          fornecedores={fornecedores} planoContas={planoContas}
          conta={editando}
          onClose={() => setEditando(null)}
          onSave={() => { setEditando(null); carregar(); }}
        />
      </Modal>

      <ModalPagar conta={pagando} onClose={() => setPagando(null)} onSave={() => { setPagando(null); carregar(); }} />

      <ModalImportarNF
        open={showImportNF}
        onClose={() => setShowImportNF(false)}
        fornecedores={fornecedores}
        planoContas={planoContas}
        onSave={() => { setShowImportNF(false); carregar(); }}
      />
    </div>
  );
}
