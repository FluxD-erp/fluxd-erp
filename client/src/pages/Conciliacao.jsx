import { useState, useRef, useCallback } from 'react';
import {
  Upload, CheckCircle2, AlertCircle, Link2, Link2Off,
  ArrowRight, Plus, RefreshCw, X, BanknoteIcon, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import { parseOfx, autoMatch } from '../lib/ofxParser';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

// ── Badge de tipo ────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
      ${tipo === 'RECEITA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {tipo === 'RECEITA' ? '+ Crédito' : '− Débito'}
    </span>
  );
}

// ── Card de transação OFX ────────────────────────────────────────
function OFXCard({ trn, matched, selecionado, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all text-sm
        ${matched
          ? 'bg-emerald-50 border-emerald-200 opacity-60'
          : selecionado
            ? 'bg-unicri-orange/5 border-unicri-orange ring-2 ring-unicri-orange/30'
            : 'bg-white border-gray-200 hover:border-unicri-navy/30'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 truncate">{trn.memo}</div>
          <div className="text-xs text-gray-400 mt-0.5">{fmtData(trn.date)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold ${trn.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trn.tipo === 'DESPESA' ? '−' : '+'}{fmt(trn.amount)}
          </div>
          <TipoBadge tipo={trn.tipo} />
        </div>
      </div>
      {matched && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1.5">
          <CheckCircle2 size={11} /> Conciliado
        </div>
      )}
    </div>
  );
}

// ── Card de lançamento ───────────────────────────────────────────
function LancCard({ lanc, matched, selecionado, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all text-sm
        ${lanc.conciliado
          ? 'bg-emerald-50 border-emerald-200 opacity-60'
          : matched
            ? 'bg-emerald-50 border-emerald-200 opacity-60'
            : selecionado
              ? 'bg-unicri-orange/5 border-unicri-orange ring-2 ring-unicri-orange/30'
              : 'bg-white border-gray-200 hover:border-unicri-navy/30'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 truncate">{lanc.descricao}</div>
          <div className="text-xs text-gray-400 mt-0.5">{fmtData(lanc.data_competencia)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold ${lanc.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
            {lanc.tipo === 'DESPESA' ? '−' : '+'}{fmt(lanc.valor)}
          </div>
          <TipoBadge tipo={lanc.tipo} />
        </div>
      </div>
      {(lanc.conciliado || matched) && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1.5">
          <CheckCircle2 size={11} /> Conciliado
        </div>
      )}
    </div>
  );
}

// ── Modal criar lançamento a partir do OFX ───────────────────────
function ModalCriarLanc({ trn, planoContas, onSave, onClose }) {
  const [form, setForm] = useState({
    descricao       : trn?.memo || '',
    tipo            : trn?.tipo || 'DESPESA',
    valor           : trn?.amount?.toFixed(2) || '',
    data_competencia: trn?.date || new Date().toISOString().split('T')[0],
    status          : 'PAGO',
    conta_id        : '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const lanc = await api.financeiro.criarLancamento({
        ...form, valor: parseFloat(form.valor),
        ofx_fitid: trn.fitid, ofx_memo: trn.memo, conciliado: true,
      });
      toast.success('Lançamento criado e conciliado!');
      onSave(lanc);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <Modal open={!!trn} onClose={onClose} title="Criar Lançamento do Extrato" size="md">
      {trn && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            Transação do banco: <strong>{trn.memo}</strong> — {fmtData(trn.date)} — {fmt(trn.amount)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Descrição *</label>
              <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option>RECEITA</option><option>DESPESA</option>
              </select>
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input className="input" type="number" step="0.01" value={form.valor}
                onChange={e => set('valor', e.target.value)} required />
            </div>
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.data_competencia}
                onChange={e => set('data_competencia', e.target.value)} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>PAGO</option><option>PENDENTE</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Conta Contábil</label>
              <select className="input" value={form.conta_id} onChange={e => set('conta_id', e.target.value)}>
                <option value="">Nenhuma</option>
                {planoContas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Criar e Conciliar</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────
export default function Conciliacao() {
  const fileRef = useRef();

  // Estado OFX
  const [ofxInfo, setOfxInfo]       = useState(null);   // { bankId, acctId, balance, ... }
  const [ofxTrns, setOfxTrns]       = useState([]);     // transações do extrato

  // Estado lançamentos
  const [lancamentos, setLancamentos] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loadingLanc, setLoadingLanc] = useState(false);

  // Mapeamento: fitid → lancamento_id  e  lancamento_id → fitid
  const [pares, setPares]   = useState({});  // { [fitid]: lancamento_id }
  const [saving, setSaving] = useState(false);

  // Seleção para match manual
  const [selOFX,  setSelOFX]  = useState(null);   // fitid selecionado
  const [selLanc, setSelLanc] = useState(null);   // lancamento id selecionado

  // Modal criar lançamento
  const [criandoDe, setCriandoDe] = useState(null);  // trn OFX

  // ── Carrega OFX ────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(ofx|qfx|ofc)$/i))
      return toast.error('Arquivo deve ser .ofx ou .qfx');

    try {
      const result = await parseOfx(file);
      if (!result.transactions.length)
        return toast.error('Nenhuma transação encontrada no arquivo');

      setOfxInfo(result);
      setOfxTrns(result.transactions);
      setPares({});
      setSelOFX(null); setSelLanc(null);

      // Carrega lançamentos do período
      setLoadingLanc(true);
      const params = {};
      if (result.dtStart) params.inicio = result.dtStart;
      if (result.dtEnd)   params.fim    = result.dtEnd;

      const [lancs, plano] = await Promise.all([
        api.financeiro.lancamentos(params),
        api.financeiro.planoContas(),
      ]);
      setLancamentos(lancs);
      setPlanoContas(plano);

      // Auto-match
      const autoPares = {};
      const usados    = new Set();
      for (const trn of result.transactions) {
        const match = autoMatch(trn, lancs.filter(l => !usados.has(l.id)));
        if (match) { autoPares[trn.fitid] = match.id; usados.add(match.id); }
      }
      setPares(autoPares);

      const autoQtd = Object.keys(autoPares).length;
      toast.success(`${result.transactions.length} transações importadas. ${autoQtd} pareadas automaticamente.`);
    } catch (e) {
      toast.error('Erro ao ler OFX: ' + e.message);
    } finally {
      setLoadingLanc(false);
    }
  }, []);

  // ── Match manual ───────────────────────────────────────────────
  const handleClickOFX = (fitid) => {
    if (pares[fitid]) return; // já conciliado
    setSelOFX(s => s === fitid ? null : fitid);
    // Se já tem lançamento selecionado → faz o par
    if (selLanc) {
      const already = Object.entries(pares).find(([, lid]) => lid === selLanc);
      if (!already) {
        setPares(p => ({ ...p, [fitid]: selLanc }));
        setSelOFX(null); setSelLanc(null);
        toast.success('Transações vinculadas!');
      }
    }
  };

  const handleClickLanc = (lancId) => {
    const jaConciliado = lancamentos.find(l => l.id === lancId)?.conciliado;
    if (jaConciliado) return;
    if (Object.values(pares).includes(lancId)) return;

    setSelLanc(s => s === lancId ? null : lancId);
    if (selOFX && !pares[selOFX]) {
      setPares(p => ({ ...p, [selOFX]: lancId }));
      setSelOFX(null); setSelLanc(null);
      toast.success('Transações vinculadas!');
    }
  };

  const desvincular = (fitid) => {
    setPares(p => { const n = { ...p }; delete n[fitid]; return n; });
  };

  // ── Confirmar conciliação ───────────────────────────────────────
  const confirmar = async () => {
    const novos = Object.entries(pares).filter(([fitid, lancId]) => {
      const lanc = lancamentos.find(l => l.id === lancId);
      return lanc && !lanc.conciliado;
    });
    if (!novos.length) return toast.error('Nenhum par novo para conciliar');

    setSaving(true);
    try {
      const paraEnviar = novos.map(([fitid, lancId]) => ({
        lancamento_id: lancId,
        ofx_fitid    : fitid,
        ofx_memo     : ofxTrns.find(t => t.fitid === fitid)?.memo || '',
      }));
      const res = await api.financeiro.conciliarBulk(paraEnviar);
      toast.success(`${res.conciliados} lançamento(s) conciliado(s)!`);
      // Atualiza lista local
      setLancamentos(prev => prev.map(l => {
        const par = paraEnviar.find(p => p.lancamento_id === l.id);
        return par ? { ...l, conciliado: true, ofx_fitid: par.ofx_fitid } : l;
      }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Contadores
  const paresConfirmados = Object.entries(pares).filter(([, lid]) =>
    lancamentos.find(l => l.id === lid)?.conciliado
  ).length;
  const paresPendentes = Object.keys(pares).length - paresConfirmados;
  const semMatch = ofxTrns.filter(t => !pares[t.fitid] && !lancamentos.find(l => l.ofx_fitid === t.fitid)?.conciliado);

  return (
    <div>
      <PageHeader
        title="Conciliação Bancária"
        subtitle="Importe o extrato OFX e vincule às suas movimentações"
        actions={
          ofxTrns.length > 0 && paresPendentes > 0 && (
            <button className="btn-primary" onClick={confirmar} disabled={saving}>
              {saving ? 'Salvando…' : `Confirmar ${paresPendentes} conciliação${paresPendentes > 1 ? 'ões' : ''}`}
            </button>
          )
        }
      />

      {/* Upload */}
      {ofxTrns.length === 0 ? (
        <div
          className="card p-16 text-center border-2 border-dashed border-gray-200 cursor-pointer hover:border-unicri-orange/40 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          <BanknoteIcon size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">Arraste o arquivo OFX do seu banco</p>
          <p className="text-gray-400 text-sm mt-1">ou <span className="text-unicri-orange">clique para selecionar</span> — .ofx, .qfx</p>
          <p className="text-xs text-gray-300 mt-3">Compatível com todos os bancos brasileiros (Itaú, Bradesco, BB, Santander, Nubank…)</p>
          <input ref={fileRef} type="file" accept=".ofx,.qfx,.ofc" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <>
          {/* Info do extrato */}
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <BanknoteIcon size={16} className="text-unicri-orange" />
              <span>Banco <strong>{ofxInfo?.bankId || '—'}</strong></span>
              {ofxInfo?.acctId && <span>· Conta <strong>{ofxInfo.acctId}</strong></span>}
            </div>
            {ofxInfo?.dtStart && (
              <span className="text-gray-500">
                Período: {fmtData(ofxInfo.dtStart)} → {fmtData(ofxInfo.dtEnd)}
              </span>
            )}
            {ofxInfo?.balance !== undefined && (
              <span className="text-gray-600">
                Saldo extrato: <strong className={ofxInfo.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmt(ofxInfo.balance)}</strong>
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="text-emerald-600 font-semibold">{Object.keys(pares).length} pareados</span>
              <span className="text-amber-500 font-semibold">{semMatch.length} sem match</span>
              <button onClick={() => { setOfxTrns([]); setOfxInfo(null); setPares({}); }}
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <RefreshCw size={12} /> Trocar arquivo
              </button>
            </div>
          </div>

          {/* Instrução de match manual */}
          {(selOFX || selLanc) && (
            <div className="flex items-center gap-2 bg-unicri-orange/5 border border-unicri-orange/20 rounded-xl px-4 py-2 text-sm text-unicri-orange mb-4">
              <Link2 size={14} />
              {selOFX
                ? 'Transação do extrato selecionada — clique em um lançamento para vincular'
                : 'Lançamento selecionado — clique em uma transação do extrato para vincular'}
              <button onClick={() => { setSelOFX(null); setSelLanc(null); }} className="ml-auto">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4">
            {/* Coluna esquerda — extrato OFX */}
            <div className="card p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <BanknoteIcon size={13} /> Extrato do Banco ({ofxTrns.length})
              </h3>
              {loadingLanc ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando lançamentos…</div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {ofxTrns.map(trn => {
                    const jaConciliado = !!lancamentos.find(l => l.ofx_fitid === trn.fitid && l.conciliado);
                    const emPar = !jaConciliado && !!pares[trn.fitid];
                    return (
                      <div key={trn.fitid}>
                        <OFXCard
                          trn={trn}
                          matched={jaConciliado || emPar}
                          selecionado={selOFX === trn.fitid}
                          onClick={() => !jaConciliado && !emPar && handleClickOFX(trn.fitid)}
                        />
                        {emPar && !jaConciliado && (
                          <div className="flex items-center justify-end gap-1 mt-0.5 pr-1">
                            <span className="text-xs text-emerald-600">Vinculado (pendente confirmação)</span>
                            <button onClick={() => desvincular(trn.fitid)}
                              className="text-gray-300 hover:text-red-400 transition-colors" title="Desvincular">
                              <Link2Off size={11} />
                            </button>
                          </div>
                        )}
                        {!jaConciliado && !emPar && (
                          <button
                            onClick={() => setCriandoDe(trn)}
                            className="w-full text-xs text-gray-400 hover:text-unicri-orange flex items-center justify-center gap-1 mt-0.5 py-0.5 transition-colors">
                            <Plus size={11} /> Criar lançamento
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Coluna central — setas */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-2 py-8">
              {ofxTrns.slice(0, 8).map((_, i) => (
                <ArrowRight key={i} size={14} className="text-gray-200" />
              ))}
            </div>

            {/* Coluna direita — lançamentos */}
            <div className="card p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText size={13} /> Lançamentos FluxD ({lancamentos.length})
              </h3>
              {loadingLanc ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando…</div>
              ) : lancamentos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum lançamento no período do extrato
                </div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {lancamentos.map(l => {
                    const emPar = Object.values(pares).includes(l.id) && !l.conciliado;
                    return (
                      <LancCard
                        key={l.id}
                        lanc={l}
                        matched={emPar}
                        selecionado={selLanc === l.id}
                        onClick={() => !l.conciliado && !emPar && handleClickLanc(l.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sumário de não conciliados */}
          {semMatch.length > 0 && (
            <div className="card p-4 mt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-600 mb-3">
                <AlertCircle size={15} /> {semMatch.length} transação(ões) do extrato sem lançamento correspondente
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {semMatch.map(trn => (
                  <div key={trn.fitid} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 truncate max-w-[160px]">{trn.memo}</div>
                      <div className="text-xs text-gray-400">{fmtData(trn.date)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-bold text-xs ${trn.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(trn.amount)}
                      </span>
                      <button onClick={() => setCriandoDe(trn)}
                        className="text-xs text-unicri-orange hover:underline flex items-center gap-0.5">
                        <Plus size={10} /> Criar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ModalCriarLanc
        trn={criandoDe}
        planoContas={planoContas}
        onClose={() => setCriandoDe(null)}
        onSave={(novoLanc) => {
          setCriandoDe(null);
          if (novoLanc) {
            setLancamentos(prev => [...prev, { ...novoLanc, conciliado: true }]);
            // Remove da lista sem match
            const trn = criandoDe;
            if (trn) setPares(p => ({ ...p, [trn.fitid]: novoLanc.id }));
          }
        }}
      />
    </div>
  );
}
