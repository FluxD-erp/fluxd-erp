import { useEffect, useState } from 'react';
import { Plus, Shield, UserCheck, UserX, Mail, ChevronDown, RefreshCw,
  Clock, Building2, Link2, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const apiBase = import.meta.env.VITE_API_URL ?? '';
  return { apiBase, headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }};
}

const PERFIS = [
  { value: 'ADMIN',        label: 'Admin',        desc: 'Acesso total, incluindo usuários e logs' },
  { value: 'FINANCEIRO',   label: 'Financeiro',   desc: 'Leitura e gravação de dados financeiros' },
  { value: 'VISUALIZACAO', label: 'Visualização', desc: 'Somente leitura, sem edição de dados' },
];

const PERFIL_BADGE = {
  ADMIN:        'bg-red-100 text-red-700',
  FINANCEIRO:   'bg-unicri-orange/10 text-unicri-orange',
  VISUALIZACAO: 'bg-gray-100 text-gray-500',
};

function BadgePerfil({ perfil }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PERFIL_BADGE[perfil] || 'bg-gray-100 text-gray-500'}`}>
      <Shield size={11} />
      {PERFIS.find(p => p.value === perfil)?.label ?? perfil}
    </span>
  );
}

function InviteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ email: '', nome: '', perfil: 'VISUALIZACAO' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.nome) return toast.error('Preencha e-mail e nome.');
    setBusy(true);
    const { apiBase, headers } = await getAuthHeaders();
    const res = await fetch(`${apiBase}/api/admin/invite-user`, {
      method: 'POST', headers, body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) toast.error(data.error || 'Erro ao convidar usuário.');
    else { toast.success(`Convite enviado para ${form.email}`); onSaved(); onClose(); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nome completo *</label>
        <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)}
          placeholder="João Silva" required />
      </div>
      <div>
        <label className="label">E-mail *</label>
        <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="joao@empresa.com" required />
      </div>
      <div>
        <label className="label">Perfil global *</label>
        <select className="input" value={form.perfil} onChange={e => set('perfil', e.target.value)}>
          {PERFIS.map(p => (
            <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
          ))}
        </select>
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
        O usuário receberá um e-mail com o link para definir sua senha.
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? 'Enviando…' : <><Mail size={14}/> Enviar convite</>}
        </button>
      </div>
    </form>
  );
}

function EditPerfilDropdown({ userId, currentPerfil, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { profile: me } = useAuth();

  async function changePerfil(newPerfil) {
    if (newPerfil === currentPerfil) { setOpen(false); return; }
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ perfil: newPerfil }).eq('id', userId);
    setBusy(false); setOpen(false);
    if (error) toast.error('Erro ao alterar perfil: ' + error.message);
    else { toast.success('Perfil atualizado!'); onUpdated(); }
  }

  if (userId === me?.id) return <BadgePerfil perfil={currentPerfil} />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-60 cursor-pointer ${PERFIL_BADGE[currentPerfil]}`}
      >
        <Shield size={11} />
        {PERFIS.find(p => p.value === currentPerfil)?.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px]">
          {PERFIS.map(p => (
            <button key={p.value} onClick={() => changePerfil(p.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors
                ${p.value === currentPerfil ? 'font-bold text-unicri-orange' : 'text-gray-700'}`}>
              <div className="font-semibold">{p.label}</div>
              <div className="text-gray-400 text-[10px]">{p.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VincularModal({ empresaId, usersGlobais, usersVinculados, onClose, onSaved }) {
  const [userId, setUserId] = useState('');
  const [perfil, setPerfil] = useState('VISUALIZACAO');
  const [busy, setBusy]     = useState(false);

  const vinculadosIds = new Set((usersVinculados || []).map(ue => ue.profiles?.id));
  const disponíveis   = (usersGlobais || []).filter(u => !vinculadosIds.has(u.id));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId) return toast.error('Selecione um usuário.');
    setBusy(true);
    try {
      await api.empresas.usuarios.vincular(empresaId, { user_id: userId, perfil });
      toast.success('Usuário vinculado à empresa!');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Usuário *</label>
        <select className="input" value={userId} onChange={e => setUserId(e.target.value)} required>
          <option value="">Selecione…</option>
          {disponíveis.map(u => (
            <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
          ))}
        </select>
        {disponíveis.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">Todos os usuários já têm acesso a esta empresa.</p>
        )}
      </div>
      <div>
        <label className="label">Perfil nesta empresa *</label>
        <select className="input" value={perfil} onChange={e => setPerfil(e.target.value)}>
          {PERFIS.map(p => (
            <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={busy || disponíveis.length === 0} className="btn-primary disabled:opacity-60">
          {busy ? 'Vinculando…' : <><Link2 size={14}/> Vincular</>}
        </button>
      </div>
    </form>
  );
}

export default function GestaoAcessos() {
  const { profile: me, empresaAtiva } = useAuth();
  const [users, setUsers]               = useState([]);
  const [usersEmpresa, setUsersEmpresa] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [showVincular, setShowVincular] = useState(false);
  const [tab, setTab]                   = useState('usuarios');

  async function carregar() {
    setLoading(true);
    try {
      const { apiBase, headers } = await getAuthHeaders();
      const res = await fetch(`${apiBase}/api/admin/users`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (e) {
      toast.error('Erro ao carregar usuários: ' + e.message);
    }
    setLoading(false);
  }

  async function carregarEmpresa() {
    if (!empresaAtiva) return;
    try {
      const data = await api.empresas.usuarios.listar(empresaAtiva.id);
      setUsersEmpresa(data || []);
    } catch (e) {
      toast.error('Erro ao carregar usuários da empresa: ' + e.message);
    }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { carregarEmpresa(); }, [empresaAtiva?.id]);

  async function toggleAtivo(user) {
    if (user.id === me?.id) { toast.error('Você não pode desativar sua própria conta.'); return; }
    const { error } = await supabase.from('profiles').update({ ativo: !user.ativo }).eq('id', user.id);
    if (error) toast.error(error.message);
    else { toast.success(user.ativo ? 'Usuário desativado.' : 'Usuário reativado.'); carregar(); }
  }

  async function reenviarConvite(user) {
    try {
      const { apiBase, headers } = await getAuthHeaders();
      const res = await fetch(`${apiBase}/api/admin/resend-invite`, {
        method: 'POST', headers, body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Convite reenviado para ${user.email}`);
    } catch (e) {
      toast.error('Erro ao reenviar convite: ' + e.message);
    }
  }

  async function desvincularEmpresa(ue) {
    try {
      await api.empresas.usuarios.atualizar(empresaAtiva.id, ue.profiles?.id, { ativo: false });
      toast.success('Acesso revogado.');
      carregarEmpresa();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function alterarPerfilEmpresa(ue, novoPerfil) {
    try {
      await api.empresas.usuarios.atualizar(empresaAtiva.id, ue.profiles?.id, { perfil: novoPerfil });
      toast.success('Perfil atualizado!');
      carregarEmpresa();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const ativos    = users.filter(u => u.ativo).length;
  const inativos  = users.filter(u => !u.ativo).length;
  const pendentes = users.filter(u => !u.confirmado).length;

  return (
    <div>
      <PageHeader
        title="Gestão de Acessos"
        subtitle="Usuários, perfis e permissões do sistema"
        actions={
          <button className="btn-primary" onClick={() => setShowInvite(true)}>
            <Plus size={16} /> Convidar usuário
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-unicri-orange">
          <div className="text-xs text-gray-500 mb-1">Total de usuários</div>
          <div className="text-2xl font-bold text-unicri-navy">{users.length}</div>
        </div>
        <div className="card p-4 border-l-4 border-emerald-400">
          <div className="text-xs text-gray-500 mb-1">Ativos</div>
          <div className="text-2xl font-bold text-emerald-600">{ativos}</div>
        </div>
        <div className="card p-4 border-l-4 border-gray-300">
          <div className="text-xs text-gray-500 mb-1">Inativos</div>
          <div className="text-2xl font-bold text-gray-400">{inativos}</div>
        </div>
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="text-xs text-gray-500 mb-1">Convite pendente</div>
          <div className="text-2xl font-bold text-amber-500">{pendentes}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('usuarios')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors
            ${tab === 'usuarios' ? 'bg-white text-unicri-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Usuários globais
        </button>
        <button
          onClick={() => { setTab('empresa'); carregarEmpresa(); }}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5
            ${tab === 'empresa' ? 'bg-white text-unicri-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 size={13} />
          {empresaAtiva ? empresaAtiva.nome : 'Esta empresa'}
        </button>
      </div>

      {/* ── Tab: Usuários globais ── */}
      {tab === 'usuarios' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Perfil global</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Cadastrado em</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Carregando…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Nenhum usuário cadastrado.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/50 ${!u.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-unicri-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{u.nome}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <EditPerfilDropdown userId={u.id} currentPerfil={u.perfil} onUpdated={carregar} />
                  </td>
                  <td className="px-5 py-3">
                    {!u.confirmado
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={12}/> Pendente</span>
                      : u.ativo
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><UserCheck size={12}/> Ativo</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400"><UserX size={12}/> Inativo</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-2 items-center">
                      {!u.confirmado && (
                        <button
                          onClick={() => reenviarConvite(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Reenviar e-mail de convite"
                        >
                          <RefreshCw size={12}/> Reenviar
                        </button>
                      )}
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleAtivo(u)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                            ${u.ativo
                              ? 'border-red-200 text-red-500 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                        >
                          {u.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Usuários desta empresa ── */}
      {tab === 'empresa' && (
        !empresaAtiva ? (
          <div className="card p-8 text-center text-gray-400">
            Selecione uma empresa no menu lateral para gerenciar seus usuários.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="font-semibold text-gray-800">Acesso a {empresaAtiva.nome}</div>
                <div className="text-xs text-gray-400">{usersEmpresa.length} usuário(s) com acesso</div>
              </div>
              <button className="btn-secondary text-sm" onClick={() => setShowVincular(true)}>
                <Link2 size={14}/> Vincular usuário
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Perfil nesta empresa</th>
                  <th className="px-5 py-3">Vinculado em</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersEmpresa.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                    Nenhum usuário vinculado a esta empresa.
                  </td></tr>
                ) : usersEmpresa.map(ue => {
                  const u = ue.profiles;
                  if (!u) return null;
                  return (
                    <tr key={ue.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-unicri-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{u.nome}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          value={ue.perfil}
                          onChange={e => alterarPerfilEmpresa(ue, e.target.value)}
                        >
                          {PERFIS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(ue.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {u.id !== me?.id && (
                          <button
                            onClick={() => desvincularEmpresa(ue)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Unlink size={12}/> Revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modais */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Convidar novo usuário" size="sm">
        <InviteModal onClose={() => setShowInvite(false)} onSaved={carregar} />
      </Modal>

      <Modal open={showVincular} onClose={() => setShowVincular(false)} title="Vincular usuário a esta empresa" size="sm">
        <VincularModal
          empresaId={empresaAtiva?.id}
          usersGlobais={users}
          usersVinculados={usersEmpresa}
          onClose={() => setShowVincular(false)}
          onSaved={carregarEmpresa}
        />
      </Modal>
    </div>
  );
}
