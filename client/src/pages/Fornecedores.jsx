import { useEffect, useState } from 'react';
import { Plus, Search, Building2, User, CheckCircle2, XCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

function CnpjBusca({ onResult }) {
  const [doc, setDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const formatCnpj = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      .replace(/(\d{2})(\d{3})(\d{3})(\d{4})$/, '$1.$2.$3/$4')
      .replace(/(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3')
      .replace(/(\d{2})(\d{3})$/, '$1.$2');
  };

  const buscar = async () => {
    setErro('');
    const cnpj = doc.replace(/\D/g, '');
    if (cnpj.length !== 14) return setErro('CNPJ deve ter 14 dígitos');
    setLoading(true);
    try {
      const dados = await api.cnpj(cnpj);
      onResult(dados);
      toast.success('Dados carregados da Receita Federal!');
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-unicri-cream border border-unicri-orange/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-unicri-orange" />
        <span className="text-sm font-semibold text-unicri-navy">Busca automática na Receita Federal</span>
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Digite o CNPJ (ex: 00.000.000/0001-00)"
          value={doc} onChange={e => setDoc(formatCnpj(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && buscar()} maxLength={18} />
        <button className="btn-primary shrink-0" onClick={buscar} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'Consultando...' : 'Buscar CNPJ'}
        </button>
      </div>
      {erro && <div className="flex items-center gap-2 mt-2 text-red-600 text-xs"><AlertCircle size={14} /> {erro}</div>}
    </div>
  );
}

const CATEGORIAS = [
  'Material de Escritório','Telecomunicações','Energia / Utilities','Serviços de TI',
  'Manutenção','Alimentação','Transporte','Marketing','Consultoria','Concessionária','Outros'
];

function FormFornecedor({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo: 'PJ', nome: '', razao_social: '', cpf_cnpj: '',
    email: '', telefone: '', endereco: '', numero: '',
    complemento: '', bairro: '', cidade: '', uf: '', cep: '',
    situacao_cadastral: '', atividade_principal: '', categoria: '', ativo: 1,
    ...initial,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleReceita = (dados) => {
    setForm(f => ({
      ...f, tipo: 'PJ',
      razao_social: dados.razao_social || f.razao_social,
      nome: dados.nome_fantasia || dados.razao_social || f.nome,
      cpf_cnpj: dados.cnpj || f.cpf_cnpj,
      email: dados.email || f.email,
      telefone: dados.telefone || f.telefone,
      endereco: dados.logradouro || f.endereco,
      numero: dados.numero || f.numero,
      complemento: dados.complemento || f.complemento,
      bairro: dados.bairro || f.bairro,
      cidade: dados.municipio || f.cidade,
      uf: dados.uf || f.uf,
      cep: dados.cep || f.cep,
      situacao_cadastral: dados.situacao_cadastral || f.situacao_cadastral,
      atividade_principal: dados.atividade_principal || f.atividade_principal,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome) return toast.error('Nome é obrigatório');
    try {
      if (initial.id) {
        await api.fornecedores.atualizar(initial.id, form);
        toast.success('Fornecedor atualizado!');
      } else {
        await api.fornecedores.criar(form);
        toast.success('Fornecedor cadastrado!');
      }
      onSave();
    } catch (e) { toast.error(e.message); }
  };

  const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial.id && form.tipo === 'PJ' && <CnpjBusca onResult={handleReceita} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Tipo *</label>
          <div className="flex gap-3">
            {[['PJ', Building2, 'Pessoa Jurídica'], ['PF', User, 'Pessoa Física']].map(([t, Icon, label]) => (
              <label key={t} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer flex-1 justify-center text-sm font-medium transition-colors
                ${form.tipo === t ? 'border-unicri-orange bg-unicri-orange/5 text-unicri-orange' : 'border-gray-200 text-gray-500'}`}>
                <input type="radio" className="sr-only" value={t} checked={form.tipo === t} onChange={() => set('tipo', t)} />
                <Icon size={16} /> {label}
              </label>
            ))}
          </div>
        </div>

        {form.tipo === 'PJ' && (
          <div className="col-span-2">
            <label className="label">Razão Social</label>
            <input className="input" value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
          </div>
        )}
        <div className="col-span-2">
          <label className="label">{form.tipo === 'PJ' ? 'Nome Fantasia' : 'Nome'} *</label>
          <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>
        <div>
          <label className="label">{form.tipo === 'PJ' ? 'CNPJ' : 'CPF'}</label>
          <input className="input" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            <option value="">Selecione...</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
        </div>

        <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wide border-t border-gray-100 pt-2">Endereço</div>
        <div className="col-span-2">
          <label className="label">Logradouro</label>
          <input className="input" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
        </div>
        <div>
          <label className="label">Número</label>
          <input className="input" value={form.numero} onChange={e => set('numero', e.target.value)} />
        </div>
        <div>
          <label className="label">Bairro</label>
          <input className="input" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input className="input" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
        </div>
        <div>
          <label className="label">UF</label>
          <select className="input" value={form.uf} onChange={e => set('uf', e.target.value)}>
            <option value="">—</option>
            {ufs.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        {form.situacao_cadastral && (
          <div className="col-span-2">
            <label className="label">Situação Cadastral</label>
            <input className="input bg-gray-50" value={form.situacao_cadastral} readOnly />
          </div>
        )}
        {form.atividade_principal && (
          <div className="col-span-2">
            <label className="label">Atividade Principal (CNAE)</label>
            <input className="input bg-gray-50" value={form.atividade_principal} readOnly />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{initial.id ? 'Atualizar' : 'Cadastrar'} Fornecedor</button>
      </div>
    </form>
  );
}

export default function Fornecedores() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [search, setSearch] = useState('');
  const [selecionados, setSelecionados] = useState(new Set());

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    const data = await api.fornecedores.listar(params);
    setLista(data);
    setLoading(false);
    setSelecionados(new Set());
  };

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [search]);

  const desativar = async (id) => {
    if (!confirm('Desativar este fornecedor?')) return;
    await api.fornecedores.excluir(id);
    toast.success('Fornecedor desativado');
    carregar();
  };

  const toggleSelecionado = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const ativos = lista.filter(f => f.ativo).map(f => f.id);
    if (selecionados.size === ativos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(ativos));
    }
  };

  const desativarLote = async () => {
    if (!confirm(`Desativar ${selecionados.size} fornecedor(es)?`)) return;
    try {
      await Promise.all([...selecionados].map(id => api.fornecedores.excluir(id)));
      toast.success(`${selecionados.size} fornecedor(es) desativado(s)`);
      carregar();
    } catch (e) { toast.error(e.message); }
  };

  const ativos = lista.filter(f => f.ativo);
  const todosSelecionados = ativos.length > 0 && selecionados.size === ativos.length;

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${lista.length} fornecedor(es) cadastrado(s)`}
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Novo Fornecedor
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Buscar por nome, CNPJ, categoria ou e-mail..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {selecionados.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-unicri-navy text-white rounded-xl text-sm">
          <span className="font-medium">{selecionados.size} selecionado(s)</span>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
            onClick={desativarLote}>
            <Trash2 size={13} /> Desativar selecionados
          </button>
          <button className="text-xs text-white/60 hover:text-white transition-colors"
            onClick={() => setSelecionados(new Set())}>
            Limpar seleção
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" className="rounded border-gray-300 text-unicri-orange focus:ring-unicri-orange"
                  checked={todosSelecionados} onChange={toggleTodos}
                  disabled={ativos.length === 0} />
              </th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">CNPJ/CPF</th>
              <th className="px-5 py-3">Categoria</th>
              <th className="px-5 py-3">Contato</th>
              <th className="px-5 py-3">Cidade/UF</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Nenhum fornecedor encontrado</td></tr>
            ) : lista.map(f => (
              <tr key={f.id} className={`hover:bg-gray-50/50 transition-colors ${!f.ativo ? 'opacity-50' : ''} ${selecionados.has(f.id) ? 'bg-blue-50/40' : ''}`}>
                <td className="px-4 py-3">
                  {f.ativo && (
                    <input type="checkbox" className="rounded border-gray-300 text-unicri-orange focus:ring-unicri-orange"
                      checked={selecionados.has(f.id)} onChange={() => toggleSelecionado(f.id)} />
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-800">{f.nome}</div>
                  {f.razao_social && f.razao_social !== f.nome && (
                    <div className="text-xs text-gray-400">{f.razao_social}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{f.cpf_cnpj || '—'}</td>
                <td className="px-5 py-3 text-xs">
                  {f.categoria && (
                    <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{f.categoria}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  <div>{f.email || '—'}</div>
                  <div>{f.telefone}</div>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{f.cidade}{f.uf ? `/${f.uf}` : ''}</td>
                <td className="px-5 py-3 text-xs">
                  {f.situacao_cadastral ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold
                      ${f.situacao_cadastral?.toLowerCase().includes('ativa') ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {f.situacao_cadastral?.toLowerCase().includes('ativa') ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {f.situacao_cadastral}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button className="btn-secondary py-1 px-2 text-xs" onClick={() => setEditando(f)}>Editar</button>
                    {f.ativo ? (
                      <button className="btn-danger py-1 px-2 text-xs" onClick={() => desativar(f.id)}>
                        <XCircle size={12} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Fornecedor" size="lg">
        <FormFornecedor onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); carregar(); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Fornecedor" size="lg">
        {editando && (
          <FormFornecedor initial={editando} onClose={() => setEditando(null)}
            onSave={() => { setEditando(null); carregar(); }} />
        )}
      </Modal>
    </div>
  );
}
