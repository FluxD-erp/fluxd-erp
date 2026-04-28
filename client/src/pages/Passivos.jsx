import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, Clock, TrendingDown, Info, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, fmt, fmtData } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

// Categorias de passivos especiais
const CATEGORIAS = [
  { key: 'divida_ativa', label: 'Dívida Ativa da União', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'parcelamento', label: 'Parcelamentos Fiscais', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' },
  { key: 'capital_terceiros', label: 'Capital de Terceiros / Empréstimos', icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'trabalhista', label: 'Obrigações Trabalhistas/Prev.', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const PROGRAMAS_PARCELAMENTO = [
  'PERT (Lei 13.496/2017)',
  'REFIS (Lei 9.964/2000)',
  'Parcelamento PGFN Ordinário',
  'Parcelamento Simples Nacional',
  'Parcelamento Estadual',
  'Parcelamento Municipal',
  'Outro',
];

const TIPOS_DIVIDA_ATIVA = [
  'Imposto de Renda (IRPJ)',
  'CSLL',
  'PIS/COFINS',
  'IPI',
  'Contribuição Previdenciária',
  'FGTS',
  'Multa por Infração',
  'Outro Tributo Federal',
];

function BadgeStatus({ status }) {
  const map = {
    ATIVO: 'bg-emerald-100 text-emerald-700',
    QUITADO: 'bg-gray-100 text-gray-500',
    INADIMPLENTE: 'bg-red-100 text-red-700',
    SUSPENSO: 'bg-yellow-100 text-yellow-700',
    EM_NEGOCIACAO: 'bg-blue-100 text-blue-700',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status?.replace('_', ' ')}</span>;
}

function FormPassivo({ onSave, onClose, planoContas }) {
  const [form, setForm] = useState({
    categoria: 'divida_ativa',
    descricao: '',
    credor: '',
    programa: '',
    tipo_divida: '',
    valor_original: '',
    valor_atual: '',
    valor_parcela: '',
    total_parcelas: '',
    parcelas_pagas: '',
    data_origem: '',
    data_vencimento: '',
    data_proxima_parcela: '',
    taxa_juros: '',
    status: 'ATIVO',
    conta_id: '',
    observacao: '',
    prazo_meses: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao || !form.valor_original)
      return toast.error('Preencha descrição e valor original');

    // Salva como lançamento especial + conta a pagar
    const valorAtual = parseFloat(form.valor_atual || form.valor_original);
    try {
      await api.financeiro.criarContaPagar({
        fornecedor_id: null,
        descricao: `[${CATEGORIAS.find(c => c.key === form.categoria)?.label}] ${form.descricao}`,
        valor_original: parseFloat(form.valor_original),
        data_emissao: form.data_origem || new Date().toISOString().split('T')[0],
        data_vencimento: form.data_vencimento || new Date(new Date().getTime() + 30 * 864e5).toISOString().split('T')[0],
        numero_documento: form.programa || form.tipo_divida,
        conta_id: form.conta_id || null,
        observacao: [
          form.credor && `Credor: ${form.credor}`,
          form.taxa_juros && `Juros: ${form.taxa_juros}% a.m.`,
          form.total_parcelas && `Parcelas: ${form.parcelas_pagas || 0}/${form.total_parcelas}`,
          form.prazo_meses && `Prazo: ${form.prazo_meses} meses`,
          form.observacao,
        ].filter(Boolean).join(' | '),
      });
      toast.success('Passivo cadastrado!');
      onSave();
    } catch (e) {
      // Pode falhar por foreign key (fornecedor_id null) — salva como lançamento
      try {
        await api.financeiro.criarLancamento({
          descricao: `[PASSIVO] ${form.descricao}`,
          tipo: 'DESPESA',
          valor: valorAtual,
          data_competencia: form.data_origem || new Date().toISOString().split('T')[0],
          status: 'PENDENTE',
          conta_id: form.conta_id || null,
          observacao: form.observacao,
        });
        toast.success('Passivo registrado como lançamento!');
        onSave();
      } catch (e2) { toast.error(e2.message); }
    }
  };

  const cat = form.categoria;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Categoria */}
      <div>
        <label className="label">Categoria do Passivo *</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map(c => (
            <label key={c.key} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-colors
              ${form.categoria === c.key ? 'border-unicri-orange bg-unicri-orange/5 text-unicri-orange' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              <input type="radio" className="sr-only" value={c.key} checked={form.categoria === c.key} onChange={() => set('categoria', c.key)} />
              <c.icon size={15} /> {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Descrição *</label>
          <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)}
            placeholder={cat === 'divida_ativa' ? 'Ex: IRPJ 2022 inscrito em dívida ativa' : cat === 'parcelamento' ? 'Ex: PERT - parcelamento tributos federais' : 'Ex: Empréstimo pessoal - Capital de giro'} required />
        </div>

        {cat === 'divida_ativa' && (
          <div className="col-span-2">
            <label className="label">Tipo de Tributo</label>
            <select className="input" value={form.tipo_divida} onChange={e => set('tipo_divida', e.target.value)}>
              <option value="">Selecione...</option>
              {TIPOS_DIVIDA_ATIVA.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}

        {cat === 'parcelamento' && (
          <div className="col-span-2">
            <label className="label">Programa de Parcelamento</label>
            <select className="input" value={form.programa} onChange={e => set('programa', e.target.value)}>
              <option value="">Selecione...</option>
              {PROGRAMAS_PARCELAMENTO.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        )}

        <div className="col-span-2">
          <label className="label">Credor / Órgão</label>
          <input className="input" value={form.credor} onChange={e => set('credor', e.target.value)}
            placeholder={cat === 'divida_ativa' ? 'PGFN / Receita Federal' : cat === 'parcelamento' ? 'PGFN / Receita Federal / Estado' : 'Nome do credor'} />
        </div>

        <div>
          <label className="label">Valor Original (R$) *</label>
          <input className="input" type="number" step="0.01" min="0" value={form.valor_original}
            onChange={e => set('valor_original', e.target.value)} required />
        </div>
        <div>
          <label className="label">Valor Atual com Correção (R$)</label>
          <input className="input" type="number" step="0.01" min="0" value={form.valor_atual}
            onChange={e => set('valor_atual', e.target.value)} placeholder="Se diferente do original" />
        </div>

        {(cat === 'parcelamento' || cat === 'capital_terceiros') && (
          <>
            <div>
              <label className="label">Valor da Parcela (R$)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.valor_parcela}
                onChange={e => set('valor_parcela', e.target.value)} />
            </div>
            <div>
              <label className="label">Taxa de Juros (% a.m.)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.taxa_juros}
                onChange={e => set('taxa_juros', e.target.value)} />
            </div>
            <div>
              <label className="label">Total de Parcelas</label>
              <input className="input" type="number" min="1" value={form.total_parcelas}
                onChange={e => set('total_parcelas', e.target.value)} />
            </div>
            <div>
              <label className="label">Parcelas Já Pagas</label>
              <input className="input" type="number" min="0" value={form.parcelas_pagas}
                onChange={e => set('parcelas_pagas', e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className="label">Data de Origem</label>
          <input className="input" type="date" value={form.data_origem} onChange={e => set('data_origem', e.target.value)} />
        </div>
        <div>
          <label className="label">Vencimento Final / Próxima Parcela</label>
          <input className="input" type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="label">Conta Contábil</label>
          <select className="input" value={form.conta_id} onChange={e => set('conta_id', e.target.value)}>
            <option value="">Selecione a conta...</option>
            {planoContas.filter(c => c.tipo === 'PASSIVO').map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Observações / Número do Processo</label>
          <textarea className="input" rows={2} value={form.observacao} onChange={e => set('observacao', e.target.value)}
            placeholder="Número do processo, número do parcelamento, contato do credor..." />
        </div>
      </div>

      {cat === 'capital_terceiros' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Capital informal deve ser quitado com prioridade. Avalie substituição por crédito formal (Pronampe, cooperativa de crédito ou banco) para reduzir risco jurídico e custo financeiro.</span>
        </div>
      )}

      {cat === 'parcelamento' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Atenção: 3 parcelas em atraso cancelam o parcelamento e reinstalam a dívida integral com multa. Configure alertas para o vencimento de cada parcela.</span>
        </div>
      )}

      {cat === 'divida_ativa' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Dívida Ativa gera risco de penhora online (BacenJud) e bloqueio de CNDs. Priorize a regularização — verifique elegibilidade para PERT ou negociação com a PGFN.</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">Registrar Passivo</button>
      </div>
    </form>
  );
}

export default function Passivos() {
  const [contas, setContas] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [search, setSearch] = useState('');

  const carregar = async () => {
    setLoading(true);
    const [cp, pc] = await Promise.all([
      api.financeiro.contasPagar({ search }),
      api.financeiro.planoContas(),
    ]);
    // Filtra apenas contas que representam passivos especiais (marcadas com [categoria])
    const passivos = cp.filter(c =>
      CATEGORIAS.some(cat => c.descricao?.includes(`[${cat.label}]`)) ||
      c.descricao?.includes('[PASSIVO]')
    );
    setContas(cp); // Mostra todas por ora — o usuário pode filtrar
    setPlanoContas(pc);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [search]);

  // Agrupa por categoria para o painel de resumo
  const passivosEspeciais = contas.filter(c => CATEGORIAS.some(cat => c.descricao?.includes(`[${cat.label}]`)));
  const totalPassivos = passivosEspeciais.reduce((s, c) => s + (c.valor_original - c.valor_pago), 0);

  const porCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    contas: passivosEspeciais.filter(c => c.descricao?.includes(`[${cat.label}]`)),
    total: passivosEspeciais.filter(c => c.descricao?.includes(`[${cat.label}]`)).reduce((s, c) => s + (c.valor_original - c.valor_pago), 0),
  }));

  return (
    <div>
      <PageHeader
        title="Passivos Especiais"
        subtitle="Dívidas Ativas, Parcelamentos e Capital de Terceiros"
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Registrar Passivo
          </button>
        }
      />

      {/* Painel de orientação CFO */}
      <div className="card p-5 mb-6 border-l-4 border-unicri-orange">
        <h3 className="text-sm font-bold text-unicri-navy mb-2">Orientação Contábil (CPC 26)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
          <div><strong className="text-gray-800">Passivo Circulante:</strong> Obrigações vencíveis em até 12 meses (contas 2.1.x)</div>
          <div><strong className="text-gray-800">Passivo Não Circulante:</strong> Saldo de longo prazo de parcelamentos e dívidas (contas 2.2.x)</div>
          <div><strong className="text-gray-800">Valor de registro:</strong> Principal + multa + juros acumulados até a data-base</div>
        </div>
      </div>

      {/* KPIs por categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {porCategoria.map(cat => (
          <div key={cat.key} className={`card p-4 border-l-4 ${cat.bg}`} style={{ borderLeftColor: '' }}>
            <div className="flex items-center gap-2 mb-2">
              <cat.icon size={16} className={cat.color} />
              <span className="text-xs font-semibold text-gray-600">{cat.label}</span>
            </div>
            <div className={`text-xl font-bold ${cat.color}`}>{fmt(cat.total)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{cat.contas.length} registro(s)</div>
          </div>
        ))}
      </div>

      {totalPassivos > 0 && (
        <div className="card p-4 mb-6 bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <div>
            <span className="font-bold text-red-700">Total de passivos especiais: {fmt(totalPassivos)}</span>
            <span className="text-red-600 text-sm ml-2">— Requer plano de regularização imediato</span>
          </div>
        </div>
      )}

      {/* Plano de Contas — Passivos disponíveis */}
      <div className="card mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Plano de Contas — Estrutura de Passivos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Contas disponíveis para classificação contábil dos passivos</p>
        </div>
        <div className="divide-y divide-gray-50">
          {planoContas.filter(c => c.tipo === 'PASSIVO').map(c => (
            <div key={c.id} className="flex items-center px-5 py-2 text-sm hover:bg-gray-50/50">
              <span className="font-mono text-xs text-gray-400 w-24 shrink-0">{c.codigo}</span>
              <span className={`${c.nivel === 1 ? 'font-bold text-unicri-navy' : c.nivel === 2 ? 'font-semibold text-gray-700' : 'text-gray-600'}`}
                style={{ paddingLeft: `${(c.nivel - 1) * 16}px` }}>
                {c.nome}
              </span>
              <span className="ml-auto text-xs text-gray-300">{c.natureza}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de passivos registrados */}
      {passivosEspeciais.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Passivos Registrados</h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-7 text-xs py-1.5 w-48" placeholder="Buscar..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Vencimento</th>
                <th className="px-5 py-3 text-right">Valor Original</th>
                <th className="px-5 py-3 text-right">Saldo Devedor</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {passivosEspeciais.map(c => {
                const cat = CATEGORIAS.find(cat => c.descricao?.includes(`[${cat.label}]`));
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800 max-w-xs">
                      <div className="truncate">{c.descricao?.replace(/\[.*?\]\s*/, '')}</div>
                      {c.observacao && <div className="text-xs text-gray-400 truncate">{c.observacao.split(' | ')[0]}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {cat && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cat.color}`}>
                          <cat.icon size={12} /> {cat.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtData(c.data_vencimento)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{fmt(c.valor_original)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-600">{fmt(c.valor_original - c.valor_pago)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.status === 'ABERTA' ? 'bg-yellow-100 text-yellow-700' :
                        c.status === 'VENCIDA' ? 'bg-red-100 text-red-700' :
                        c.status === 'PAGA' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {passivosEspeciais.length === 0 && !loading && (
        <div className="card p-10 text-center text-gray-400">
          <TrendingDown size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Nenhum passivo especial registrado ainda</p>
          <p className="text-sm mt-1">Clique em "Registrar Passivo" para cadastrar dívidas ativas, parcelamentos ou capital de terceiros.</p>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar Passivo Especial" size="lg">
        <FormPassivo
          planoContas={planoContas}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); carregar(); }}
        />
      </Modal>
    </div>
  );
}
