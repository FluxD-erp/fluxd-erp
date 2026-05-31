import { useEffect, useState, useRef, useCallback } from 'react';
import {
  CreditCard, Upload, CheckCircle2, Clock, TrendingUp,
  AlertCircle, X, Plus, Zap, RefreshCw, ChevronDown, Receipt
} from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

// ── Helpers ──────────────────────────────────────────────────────
const STATUS_BADGE = {
  PENDENTE  : 'bg-amber-100 text-amber-700',
  RECEBIDO  : 'bg-emerald-100 text-emerald-700',
  ANTECIPADO: 'bg-blue-100 text-blue-700',
  CANCELADO : 'bg-gray-100 text-gray-500',
};

const BANDEIRA_COR = {
  VISA       : 'text-blue-600',
  MASTERCARD : 'text-red-500',
  ELO        : 'text-yellow-600',
  AMEX       : 'text-blue-400',
  HIPERCARD  : 'text-red-700',
};

// Normaliza datas BR (DD/MM/YYYY) e ISO (YYYY-MM-DD)
function parseData(s) {
  if (!s) return '';
  s = s.toString().trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  return s.slice(0, 10);
}

// Normaliza valor BR (1.234,56) e US (1234.56)
function parseValor(s) {
  if (!s) return 0;
  const str = s.toString().trim().replace(/[R$\s]/g, '');
  if (str.includes(',') && str.includes('.'))
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  if (str.includes(','))
    return parseFloat(str.replace(',', '.')) || 0;
  return parseFloat(str) || 0;
}

// ── KPI Card ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'teal' }) {
  const paleta = {
    teal  : 'bg-unicri-orange/10 text-unicri-orange',
    green : 'bg-emerald-100 text-emerald-600',
    amber : 'bg-amber-100 text-amber-600',
    blue  : 'bg-blue-100 text-blue-600',
  };
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${paleta[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ── Modal Importar CSV ───────────────────────────────────────────
function ModalImportar({ open, onClose, onSave }) {
  const [rows, setRows]     = useState([]);
  const [erros, setErros]   = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const reset = () => { setRows([]); setErros([]); };

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.match(/\.(csv|txt|xlsx?)$/i))
      return toast.error('Use arquivo .csv ou .txt');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[\s/()]+/g, '_'),
      complete: ({ data }) => {
        const errosLocais = [];
        const parsed = data.map((r, i) => {
          const linha         = i + 2;
          const data_venda    = parseData(r.data_venda   || r.data_transacao || r.venda || '');
          const data_prevista = parseData(r.data_prevista|| r.data_pagamento  || r.previsao || '');
          const valor_bruto   = parseValor(r.valor_bruto  || r.valor || r.vl_bruto || '');
          const valor_liquido = parseValor(r.valor_liquido|| r.vl_liquido || r.valor_liq || '');
          const taxa_mdr      = parseValor(r.taxa_mdr     || r.mdr || r.taxa || '');
          const parcela_atual = parseInt(r.parcela || r.parcela_atual || '1') || 1;
          const num_parcelas  = parseInt(r.total_parcelas || r.num_parcelas || '1') || 1;

          if (!data_venda)    errosLocais.push({ linha, msg: 'data_venda inválida' });
          if (!data_prevista) errosLocais.push({ linha, msg: 'data_prevista inválida' });
          if (!valor_bruto)   errosLocais.push({ linha, msg: 'valor inválido' });

          return {
            operadora   : (r.operadora || 'REDE').toUpperCase(),
            bandeira    : (r.bandeira  || r.cartao || '').toUpperCase() || null,
            nsu         : r.nsu || r.cod_transacao || null,
            terminal    : r.terminal || r.pos || null,
            data_venda,
            data_prevista,
            descricao   : r.descricao || r.estabelecimento || null,
            valor_bruto,
            taxa_mdr    : taxa_mdr / 100 || 0,
            valor_liquido: valor_liquido || Math.round(valor_bruto * (1 - taxa_mdr / 100) * 100) / 100,
            parcela_atual,
            num_parcelas,
            _ok: errosLocais.filter(e => e.linha === linha).length === 0,
          };
        });
        setRows(parsed);
        setErros(errosLocais);
      },
    });
  }, []);

  const handleImportar = async () => {
    const validas = rows.filter(r => r._ok);
    if (!validas.length) return toast.error('Nenhuma linha válida');
    setLoading(true);
    try {
      const res = await api.recebiveis.importar(validas.map(({ _ok, ...r }) => r));
      toast.success(`${res.importados} recebível(is) importado(s)!`);
      reset(); onSave();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Importar Relatório Rede" size="lg">
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Como exportar do Portal Rede:</p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Acesse <strong>portalcliente.userede.com.br</strong></li>
            <li>Menu <strong>Financeiro → Agenda de Recebíveis</strong></li>
            <li>Selecione o período e clique em <strong>Exportar CSV</strong></li>
          </ol>
          <p className="mt-1">Colunas reconhecidas: data_venda, data_prevista, valor_bruto, valor_liquido, taxa_mdr, parcela, total_parcelas, bandeira, nsu</p>
        </div>

        {rows.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-unicri-orange/40 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <CreditCard size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Arraste o CSV da Rede ou <span className="text-unicri-orange">clique para selecionar</span></p>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={14} /> {rows.filter(r => r._ok).length} válidas
                </span>
                {erros.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={14} /> {erros.length} erros
                  </span>
                )}
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <X size={12} /> Trocar arquivo
              </button>
            </div>

            {erros.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 space-y-0.5 max-h-24 overflow-y-auto">
                {erros.map((e, i) => <div key={i}>Linha {e.linha}: {e.msg}</div>)}
              </div>
            )}

            <div className="overflow-x-auto max-h-64 border border-gray-100 rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-400 uppercase tracking-wide">
                    <th className="px-3 py-2">Venda</th>
                    <th className="px-3 py-2">Previsão</th>
                    <th className="px-3 py-2">Bandeira</th>
                    <th className="px-3 py-2">Parcela</th>
                    <th className="px-3 py-2 text-right">Bruto</th>
                    <th className="px-3 py-2 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={i} className={r._ok ? '' : 'bg-red-50'}>
                      <td className="px-3 py-1.5 text-gray-500">{fmtData(r.data_venda)}</td>
                      <td className="px-3 py-1.5 text-gray-500">{fmtData(r.data_prevista)}</td>
                      <td className={`px-3 py-1.5 font-medium ${BANDEIRA_COR[r.bandeira] || 'text-gray-600'}`}>{r.bandeira || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.parcela_atual}/{r.num_parcelas}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(r.valor_bruto)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-600">{fmt(r.valor_liquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={() => { reset(); onClose(); }}>Cancelar</button>
          {rows.length > 0 && (
            <button className="btn-primary" onClick={handleImportar} disabled={loading || erros.length > 0}>
              {loading ? 'Importando…' : `Importar ${rows.filter(r => r._ok).length} recebíveis`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Modal Antecipação ────────────────────────────────────────────
function ModalAntecipacao({ selecionados, recebiveis, onClose, onSave }) {
  const hoje  = new Date().toISOString().split('T')[0];
  const [taxa, setTaxa]   = useState('');
  const [dias, setDias]   = useState('30');
  const [credito, setCredito] = useState(hoje);
  const [obs, setObs]     = useState('');
  const [loading, setLoading] = useState(false);

  const itens = recebiveis.filter(r => selecionados.has(r.id));
  const valorBruto = itens.reduce((s, r) => s + Number(r.valor_liquido), 0);
  const taxaNum    = parseFloat(taxa) || 0;
  const diasNum    = parseInt(dias)   || 30;
  const taxaDiaria = taxaNum / 100 / 30;
  const desconto   = Math.round(valorBruto * taxaDiaria * diasNum * 100) / 100;
  const liquido    = Math.round((valorBruto - desconto) * 100) / 100;

  const handleConfirmar = async () => {
    if (!taxaNum) return toast.error('Informe a taxa de antecipação');
    setLoading(true);
    try {
      const res = await api.recebiveis.antecipar({
        ids              : [...selecionados],
        taxa_antecipacao : taxaNum / 100,
        dias_antecipados : diasNum,
        data_credito     : credito,
        observacao       : obs,
      });
      toast.success(`Antecipação confirmada! Líquido: ${fmt(res.valor_liquido)}`);
      onSave();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={selecionados.size > 0} onClose={onClose} title="Antecipar Recebíveis" size="md">
      <div className="space-y-4">
        {/* Resumo */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{itens.length} recebível(is) selecionado(s)</span>
            <span className="font-semibold">{fmt(valorBruto)}</span>
          </div>
          {taxaNum > 0 && (
            <>
              <div className="flex justify-between text-red-500">
                <span>Desconto ({taxaNum}% a.m. × {diasNum}d)</span>
                <span>− {fmt(desconto)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-emerald-600">
                <span>Valor líquido a receber</span>
                <span>{fmt(liquido)}</span>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Taxa de Antecipação (% a.m.) *</label>
            <input className="input" type="number" step="0.01" placeholder="Ex: 2.50"
              value={taxa} onChange={e => setTaxa(e.target.value)} />
          </div>
          <div>
            <label className="label">Dias Antecipados</label>
            <input className="input" type="number" placeholder="30"
              value={dias} onChange={e => setDias(e.target.value)} />
          </div>
          <div>
            <label className="label">Data de Crédito</label>
            <input className="input" type="date" value={credito}
              onChange={e => setCredito(e.target.value)} />
          </div>
          <div>
            <label className="label">Observação</label>
            <input className="input" placeholder="Opcional"
              value={obs} onChange={e => setObs(e.target.value)} />
          </div>
        </div>

        {taxaNum > 0 && (
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700">
            ⚠️ Serão gerados automaticamente: 1 lançamento de receita ({fmt(liquido)}) e 1 despesa financeira ({fmt(desconto)}).
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleConfirmar} disabled={loading || !taxaNum}>
            {loading ? 'Processando…' : `Confirmar Antecipação — ${fmt(liquido)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────
export default function ReceiveisCartao() {
  const [resumo, setResumo]     = useState(null);
  const [recebiveis, setRec]    = useState([]);
  const [antecipacoes, setAnts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('agenda');
  const [filtroStatus, setFiltroStatus] = useState('PENDENTE');
  const [selecionados, setSel]  = useState(new Set());
  const [showImport, setShowImport]   = useState(false);
  const [showAntec, setShowAntec]     = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [res, rec, ants] = await Promise.all([
        api.recebiveis.resumo(),
        api.recebiveis.listar({ status: filtroStatus }),
        api.recebiveis.antecipacoes(),
      ]);
      setResumo(res);
      setRec(rec || []);
      setAnts(ants || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [filtroStatus]);

  const toggleAll = () => {
    const pendentes = recebiveis.filter(r => r.status === 'PENDENTE');
    if (selecionados.size === pendentes.length) setSel(new Set());
    else setSel(new Set(pendentes.map(r => r.id)));
  };

  const toggle = (id) => {
    setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const confirmarReceber = async (id) => {
    try {
      await api.recebiveis.receber(id);
      toast.success('Recebimento confirmado!');
      carregar();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader
        title="Recebíveis de Cartão"
        subtitle="Gerencie sua agenda de recebíveis da Rede e antecipações"
        actions={
          <div className="flex gap-2">
            {selecionados.size > 0 && (
              <button className="btn-primary" onClick={() => setShowAntec(true)}>
                <Zap size={16} /> Antecipar {selecionados.size} selecionado(s)
              </button>
            )}
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} /> Importar CSV Rede
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Pendente"     value={fmt(resumo?.total_pendente)}    icon={Clock}      color="amber" sub={`${resumo?.qtd_pendente || 0} parcela(s)`} />
        <KpiCard label="Próximos 7 dias"    value={fmt(resumo?.previsto_7dias)}    icon={TrendingUp} color="teal" />
        <KpiCard label="Próximos 30 dias"   value={fmt(resumo?.previsto_30dias)}   icon={CreditCard} color="blue" />
        <KpiCard label="Recebido no mês"    value={fmt(resumo?.total_recebido_mes)} icon={CheckCircle2} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['agenda','Agenda'], ['antecipacoes','Antecipações']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === k ? 'border-unicri-orange text-unicri-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'agenda' && (
        <>
          {/* Filtro status */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['PENDENTE','RECEBIDO','ANTECIPADO','CANCELADO'].map(s => (
              <button key={s} onClick={() => { setFiltroStatus(s); setSel(new Set()); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filtroStatus === s ? 'bg-unicri-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Barra de seleção */}
          {filtroStatus === 'PENDENTE' && recebiveis.length > 0 && (
            <div className="flex items-center justify-between bg-unicri-orange/5 border border-unicri-orange/20 rounded-xl px-4 py-2 mb-3 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={selecionados.size === recebiveis.filter(r => r.status === 'PENDENTE').length && recebiveis.length > 0}
                  onChange={toggleAll} className="rounded" />
                <span className="text-gray-600">Selecionar todos para antecipação</span>
              </label>
              {selecionados.size > 0 && (
                <span className="text-unicri-orange font-semibold">
                  {selecionados.size} selecionado(s) — {fmt(recebiveis.filter(r => selecionados.has(r.id)).reduce((s, r) => s + Number(r.valor_liquido), 0))}
                </span>
              )}
            </div>
          )}

          {/* Tabela */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  {filtroStatus === 'PENDENTE' && <th className="px-4 py-3 w-8" />}
                  <th className="px-4 py-3">Venda</th>
                  <th className="px-4 py-3">Previsão</th>
                  <th className="px-4 py-3">Bandeira</th>
                  <th className="px-4 py-3">Parcela</th>
                  <th className="px-4 py-3 text-right">Bruto</th>
                  <th className="px-4 py-3 text-right">Líquido</th>
                  <th className="px-4 py-3">Status</th>
                  {filtroStatus === 'PENDENTE' && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Carregando…</td></tr>
                ) : recebiveis.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Nenhum recebível {filtroStatus.toLowerCase()}. Importe o CSV da Rede.
                  </td></tr>
                ) : recebiveis.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${selecionados.has(r.id) ? 'bg-unicri-orange/5' : ''}`}>
                    {filtroStatus === 'PENDENTE' && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selecionados.has(r.id)}
                          onChange={() => toggle(r.id)} className="rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500">{fmtData(r.data_venda)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{fmtData(r.data_prevista)}</td>
                    <td className={`px-4 py-3 font-semibold text-xs ${BANDEIRA_COR[r.bandeira] || 'text-gray-600'}`}>
                      {r.bandeira || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.parcela_atual}/{r.num_parcelas}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.valor_bruto)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(r.valor_liquido)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    {filtroStatus === 'PENDENTE' && (
                      <td className="px-4 py-3">
                        <button onClick={() => confirmarReceber(r.id)}
                          className="text-xs text-unicri-orange hover:underline flex items-center gap-1">
                          <CheckCircle2 size={12} /> Recebido
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'antecipacoes' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3 text-right">Bruto</th>
                <th className="px-4 py-3">Taxa</th>
                <th className="px-4 py-3">Dias</th>
                <th className="px-4 py-3 text-right">Desconto</th>
                <th className="px-4 py-3 text-right">Líquido</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Carregando…</td></tr>
              ) : antecipacoes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Nenhuma antecipação realizada</td></tr>
              ) : antecipacoes.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-600">{fmtData(a.data_solicitacao)}</td>
                  <td className="px-4 py-3 text-gray-600">{a.qtd_recebiveis}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(a.valor_bruto)}</td>
                  <td className="px-4 py-3 text-amber-600 font-medium">{(a.taxa_antecipacao * 100).toFixed(2)}% a.m.</td>
                  <td className="px-4 py-3 text-gray-500">{a.dias_antecipados}d</td>
                  <td className="px-4 py-3 text-right text-red-500">− {fmt(a.valor_desconto)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(a.valor_liquido)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalImportar open={showImport} onClose={() => setShowImport(false)} onSave={() => { setShowImport(false); carregar(); }} />

      {showAntec && (
        <ModalAntecipacao
          selecionados={selecionados}
          recebiveis={recebiveis}
          onClose={() => setShowAntec(false)}
          onSave={() => { setShowAntec(false); setSel(new Set()); carregar(); }}
        />
      )}
    </div>
  );
}
