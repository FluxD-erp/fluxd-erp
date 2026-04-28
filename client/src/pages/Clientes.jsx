import { useEffect, useState } from 'react';
import { Plus, Search, Building2, User, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
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
      .replace(/(\d{2})(\d{3})$/, '$1.$2')
      .replace(/(\d{2})$/, '$1');
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
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-unicri-cream border border-unicri-orange/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-unicri-orange" />
        <span className="text-sm font-semibold text-unicri-navy">Busca automática na Receita Federal</span>
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Digite o CNPJ (ex: 00.000.000/0001-00)"
          value={doc}
          onChange={e => setDoc(formatCnpj(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          maxLength={18}
        />
        <button className="btn-primary shrink-0" onClick={buscar} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'Consultando...' : 'Buscar CNPJ'}
        </button>
      </div>
      {erro && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
          <AlertCircle size={14} /> {erro}
        </div>
      )}
    </div>
  );
}

function FormCliente({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo: 'PJ', nome: '', razao_social: '', cpf_cnpj: '',
    email: '', telefone: '', endereco: '', numero: '',
    complemento: '', bairro: '', cidade: '', uf: '', cep: '',
    situacao_cadastral: '', atividade_principal: '', ativo: 1,
    ...initial,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleReceita = (dados) => {
    setForm(f => ({
      ...f,
      tipo: 'PJ',
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
    if (!form.nome || !form.tipo) return toast.error('Nome e tipo são obrigatórios');
    try {
      if (initial.id) {
        await api.clientes.atualizar(initial.id, form);
        toast.success('Cliente atualizado!');
      } else {
        await api.clientes.criar(form);
        toast.success('Cliente cadastrado!');
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
          <label className="label">Tipo de Pessoa *</label>
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
          <label className="label">{form.tipo === 'PJ' ? 'Nome Fantasia' : 'Nome Completo'} *</label>
          <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>

        <div>
          <label className="label">{form.tipo === 'PJ' ? 'CNPJ' : 'CPF'}</label>
          <input className="input" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} />
        </div>
        <div>
          <label className="label">Situação Cadastral</label>
          <input className="input" value={form.situacao_cadastral} onChange={e => set('situacao_cadastral', e.target.value)} readOnly={!!form.situacao_cadastral && !initial.id} />
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
          <label className="label">Complemento</label>
          <input className="input" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
        </div>
        <div>
          <label className="label">Bairro</label>
          <input className="input" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
        </div>
        <div>
          <label className="label">CEP</label>
          <input className="input" value={form.cep} onChange={e => set('cep', e.target.value)} />
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

        {form.atividade_principal && (
          <div className="col-span-2">
            <label className="label">Atividade Principal (CNAE)</label>
            <input className="input" value={form.atividade_principal} readOnly className="input bg-gray-50" />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{initial.id ? 'Atualizar' : 'Cadastrar'} Cliente</button>
      </div>
    </form>
  );
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [search, setSearch] = useState('');

  const carregar = async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    const data = await api.clientes.listar(params);
    setClientes(data);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(carregar, 300);
    return () => clearTimeout(t);
  }, [search]);

  const desativar = async (id) => {
    if (!confirm('Desativar este cliente?')) return;
    await api.clientes.excluir(id);
    toast.success('Cliente desativado');
    carregar();
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente(s) cadastrado(s)`}
        actions={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Novo Cliente
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">CPF/CNPJ</th>
              <th className="px-5 py-3">Contato</th>
              <th className="px-5 py-3">Cidade/UF</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Nenhum cliente encontrado</td></tr>
            ) : clientes.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${!c.ativo ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-800">{c.nome}</div>
                  {c.razao_social && c.razao_social !== c.nome && (
                    <div className="text-xs text-gray-400">{c.razao_social}</div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1 text-gray-500 text-xs">
                    {c.tipo === 'PJ' ? <Building2 size={13} /> : <User size={13} />} {c.tipo}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{c.cpf_cnpj || '—'}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  <div>{c.email || '—'}</div>
                  <div>{c.telefone}</div>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{c.cidade}{c.uf ? `/${c.uf}` : ''}</td>
                <td className="px-5 py-3 text-xs">
                  {c.situacao_cadastral ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold
                      ${c.situacao_cadastral?.toLowerCase().includes('ativa') ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {c.situacao_cadastral?.toLowerCase().includes('ativa') ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {c.situacao_cadastral}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button className="btn-secondary py-1 px-2 text-xs" onClick={() => setEditando(c)}>Editar</button>
                    {c.ativo ? (
                      <button className="btn-danger py-1 px-2 text-xs" onClick={() => desativar(c.id)}>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Cliente" size="lg">
        <FormCliente onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); carregar(); }} />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar Cliente" size="lg">
        {editando && (
          <FormCliente initial={editando} onClose={() => setEditando(null)}
            onSave={() => { setEditando(null); carregar(); }} />
        )}
      </Modal>
    </div>
  );
}
