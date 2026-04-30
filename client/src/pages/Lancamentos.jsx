import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Upload, Download, AlertCircle, CheckCircle2, X, Pencil, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

// ── CSV template para download ───────────────────────────────────
const CSV_HEADER = 'descricao,tipo,valor,data_competencia,status,observacao';
const CSV_EXEMPLO = `Venda de serviços,RECEITA,1500.00,2025-04-01,PAGO,
Aluguel escritório,DESPESA,2200.00,2025-04-05,PENDENTE,Vencimento dia 5
Assinatura software,DESPESA,99.90,2025-04-10,PENDENTE,`;

function downloadTemplate() {
  const blob = new Blob([CSV_HEADER + '\n' + CSV_EXEMPLO], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'modelo_lancamentos.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Modal de Importação ──────────────────────────────────────────
function ModalImportar({ open, onClose, onSave }) {
  const [rows, setRows]       = useState([]);   // linhas parsed
  const [erros, setErros]     = useState([]);   // { linha, msg }
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const reset = () => { setRows([]); setErros([]); };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(csv|txt)$/i))
      return toast.error('Arquivo deve ser .csv ou .txt');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data }) => {
        const errosLocais = [];
        const TIPOS  = ['RECEITA','DESPESA','TRANSFERENCIA'];
        const STATUS = ['PENDENTE','PAGO','CANCELADO'];

        const parsed = data.map((r, i) => {
          const linha  = i + 2;
          const tipo   = (r.tipo   || '').toUpperCase().trim();
          const status = (r.status || 'PENDENTE').toUpperCase().trim();
          const valor  = parseFloat((r.valor || '').toString().replace(',', '.'));
          const data_c = (r.data_competencia || r.data || '').trim();

          if (!r.descricao?.trim())           errosLocais.push({ linha, msg: 'descricao obrigatória' });
          else if (!TIPOS.includes(tipo))     errosLocais.push({ linha, msg: `tipo "${tipo}" inválido` });
          else if (!/^\d{4}-\d{2}-\d{2}$/.test(data_c)) errosLocais.push({ linha, msg: `data "${data_c}" inválida (use AAAA-MM-DD)` });
          else if (isNaN(valor) || valor <= 0) errosLocais.push({ linha, msg: `valor "${r.valor}" inválido` });

          return {
            descricao       : r.descricao?.trim() || '',
            tipo,
            valor,
            data_competencia: data_c,
            status          : STATUS.includes(status) ? status : 'PENDENTE',
            observacao      : r.observacao?.trim() || '',
            _ok             : errosLocais.filter(e => e.linha === linha).length === 0,
          };
        });

        setRows(parsed);
        setErros(errosLocais);
      },
    });
  };

  const handleImportar = async () => {
    if (erros.length > 0) return toast.error('Corrija os erros antes de importar');
    const validas = rows.filter(r => r._ok).map(({ _ok, ...r }) => r);
    if (!validas.length) return toast.error('Nenhuma linha válida');
    setLoading(true);
    try {
      const res = await api.financeiro.importar(validas);
      toast.success(`${res.importados} lançamentos importados!`);
      reset(); onSave();
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const handleClose = () => { reset(); onClose(); };

  const linhasOk   = rows.filter(r => r._ok).length;
  const linhasErro = rows.filter(r => !r._ok).length;

  return (
    <Modal open={open} onClose={handleClose} title="Importar Lançamentos via CSV" size="lg">
      <div className="space-y-4">
        {/* Instruções + template */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            Colunas obrigatórias: <strong>descricao, tipo, valor, data_competencia</strong>
            {' '}(AAAA-MM-DD). Opcionais: status, observacao.
            <button onClick={downloadTemplate} className="ml-2 underline font-medium flex items-center gap-1 inline-flex">
              <Download size={12} /> Baixar modelo
            </button>
          </div>
        </div>

        {/* Upload */}
        {rows.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-unicri-orange/40 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload size={28} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Arraste um arquivo CSV ou <span className="text-unicri-orange font-medium">clique para selecionar</span></p>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={14} /> {linhasOk} válidas
                </span>
                {linhasErro > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={14} /> {linhasErro} com erro
                  </span>
                )}
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <X size={12} /> Trocar arquivo
              </button>
            </div>

            {/* Erros */}
            {erros.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 space-y-1 max-h-28 overflow-y-auto">
                {erros.map((e, i) => <div key={i}>Linha {e.linha}: {e.msg}</div>)}
              </div>
            )}

            {/* Preview tabela */}
            <div className="overflow-x-auto max-h-64 border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-400 uppercase tracking-wide">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={i} className={r._ok ? '' : 'bg-red-50'}>
                      <td className="px-3 py-1.5 text-gray-400">{i + 2}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-700 max-w-[180px] truncate">{r.descricao || <span className="text-red-400">—</span>}</td>
                      <td className="px-3 py-1.5">
                        <span className={r.tipo === 'RECEITA' ? 'text-emerald-600' : r.tipo === 'DESPESA' ? 'text-red-500' : 'text-gray-500'}>{r.tipo || '?'}</span>
                      </td>
                      <td className="px-3 py-1.5">{isNaN(r.valor) ? <span className="text-red-400">?</span> : fmt(r.valor)}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.data_competencia || <span className="text-red-400">?</span>}</td>
                      <td className="px-3 py-1.5 text-gray-400">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={handleClose}>Cancelar</button>
          {rows.length > 0 && (
            <button className="btn-primary" onClick={handleImportar} disabled={loading || erros.length > 0}>
              {loading ? 'Importando…' : `Importar ${linhasOk} lançamentos`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Formulário manual ────────────────────────────────────────────
function FormLancamento({ onSave, onClose, clientes, fornecedores, planoContas, lancamento }) {
  const editando = !!lancamento;
  const [form, setForm] = useState({
    tipo            : lancamento?.tipo             || 'RECEITA',
    descricao       : lancamento?.descricao        || '',
    valor           : lancamento?.valor            || '',
    data_competencia: lancamento?.data_competencia || new Date().toISOString().split('T')[0],
    data_pagamento  : lancamento?.data_pagamento   || '',
    status          : lancamento?.status           || 'PENDENTE',
    conta_id        : lancamento?.conta_id         || '',
    cliente_id      : lancamento?.cliente_id       || '',
    fornecedor_id   : lancamento?.fornecedor_id    || '',
    numero_documento: lancamento?.numero_documento || '',
    observacao      : lancamento?.observacao       || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data_competencia)
      return toast.error('Preencha todos os campos obrigatórios');
    try {
      if (editando) {
        await api.financeiro.atualizarLancamento(lancamento.id, { ...form, valor: parseFloat(form.valor) });
        toast.success('Lançamento atualizado!');
      } else {
        await api.financeiro.criarLancamento({ ...form, valor: parseFloat(form.valor) });
        toast.success('Lançamento criado!');
      }
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
        <button type="submit" className="btn-primary">{editando ? 'Salvar Alterações' : 'Salvar Lançamento'}</button>
      </div>
    </form>
  );
}

// ── Página principal ─────────────────────────────────────────────
export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [clientes, setClientes]       = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editando, setEditando]       = useState(null);
  const [showImport, setShowImport]   = useState(false);
  const [filtros, setFiltros]         = useState({
    tipo: '', status: '', search: '', conta_id: '', cliente_id: '', fornecedor_id: '',
  });

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (filtros.tipo)          params.tipo          = filtros.tipo;
    if (filtros.status)        params.status        = filtros.status;
    if (filtros.search)        params.search        = filtros.search;
    if (filtros.conta_id)      params.conta_id      = filtros.conta_id;
    if (filtros.cliente_id)    params.cliente_id    = filtros.cliente_id;
    if (filtros.fornecedor_id) params.fornecedor_id = filtros.fornecedor_id;
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
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} /> Importar CSV
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Novo Lançamento
            </button>
          </div>
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
        <select className="input w-auto" value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value, cliente_id: '', fornecedor_id: '' }))}>
          {['', 'RECEITA', 'DESPESA', 'TRANSFERENCIA'].map(t => <option key={t} value={t}>{t || 'Todos os tipos'}</option>)}
        </select>
        <select className="input w-auto" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          {['', 'PENDENTE', 'PAGO', 'CANCELADO'].map(s => <option key={s} value={s}>{s || 'Todos os status'}</option>)}
        </select>
        <select className="input w-auto" value={filtros.conta_id} onChange={e => setFiltros(f => ({ ...f, conta_id: e.target.value }))}>
          <option value="">Todas as contas</option>
          {planoContas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
        </select>
        {(filtros.tipo === '' || filtros.tipo === 'RECEITA') && (
          <select className="input w-auto" value={filtros.cliente_id} onChange={e => setFiltros(f => ({ ...f, cliente_id: e.target.value }))}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {(filtros.tipo === '' || filtros.tipo === 'DESPESA') && (
          <select className="input w-auto" value={filtros.fornecedor_id} onChange={e => setFiltros(f => ({ ...f, fornecedor_id: e.target.value }))}>
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        )}
        {(filtros.conta_id || filtros.cliente_id || filtros.fornecedor_id) && (
          <button className="btn-secondary text-xs px-3"
            onClick={() => setFiltros(f => ({ ...f, conta_id: '', cliente_id: '', fornecedor_id: '' }))}>
            Limpar filtros
          </button>
        )}
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
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : lancamentos.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
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
                <td className="px-5 py-3">
                  {l.status !== 'CANCELADO' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditando(l)}
                        className="text-gray-300 hover:text-unicri-orange transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => {
                          if (!confirm('Cancelar este lançamento?')) return;
                          try {
                            await api.financeiro.deletarLancamento(l.id);
                            toast.success('Lançamento cancelado');
                            carregar();
                          } catch (e) { toast.error(e.message); }
                        }}
                        className="text-gray-300 hover:text-red-400 transition-colors" title="Cancelar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
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

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Lançamento" size="lg">
        <FormLancamento
          clientes={clientes} fornecedores={fornecedores} planoContas={planoContas}
          lancamento={editando}
          onClose={() => setEditando(null)}
          onSave={() => { setEditando(null); carregar(); }}
        />
      </Modal>

      <ModalImportar open={showImport} onClose={() => setShowImport(false)} onSave={() => { setShowImport(false); carregar(); }} />
    </div>
  );
}
