import { useEffect, useState, useCallback } from 'react';
import {
  User, Lock, Building2, Users, ScrollText, Bell, CreditCard,
  Plug, Palette, ChevronRight, Shield, Save, Eye, EyeOff,
  Check, AlertTriangle, Search, Filter, RefreshCw, ChevronDown,
  Zap, Globe, Mail, Smartphone, TrendingUp, Link2, Unlink,
  Plus, UserCheck, UserX, Clock, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Modal from '../components/Modal';

// ─────────────────────────────────────────────
// Definição das seções do menu de configurações
// ─────────────────────────────────────────────
const SECTIONS = [
  {
    group: 'Minha Conta',
    items: [
      { id: 'perfil',    label: 'Meu Perfil',        icon: User },
      { id: 'seguranca', label: 'Senha e Segurança',  icon: Lock },
    ],
  },
  {
    group: 'Empresa',
    items: [
      { id: 'empresa',   label: 'Dados da Empresa',   icon: Building2 },
      { id: 'usuarios',  label: 'Usuários e Acessos', icon: Users,      adminOnly: true },
      { id: 'logs',      label: 'Logs do Sistema',    icon: ScrollText, adminOnly: true },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { id: 'notificacoes', label: 'Notificações',       icon: Bell },
      { id: 'plano',        label: 'Plano e Faturamento', icon: CreditCard },
      { id: 'integracoes',  label: 'Integrações',         icon: Plug },
      { id: 'aparencia',    label: 'Aparência',            icon: Palette },
    ],
  },
];

// ─── Badge reutilizável ───────────────────────
const PERFIL_BADGE = {
  ADMIN:        'bg-red-100 text-red-700',
  FINANCEIRO:   'bg-unicri-orange/10 text-unicri-orange',
  VISUALIZACAO: 'bg-gray-100 text-gray-500',
};
const PERFIS = [
  { value: 'ADMIN',        label: 'Admin',        desc: 'Acesso total' },
  { value: 'FINANCEIRO',   label: 'Financeiro',   desc: 'Leitura e gravação financeira' },
  { value: 'VISUALIZACAO', label: 'Visualização', desc: 'Somente leitura' },
];

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="card p-6 mb-6">
      {(title || subtitle) && (
        <div className="mb-5 pb-4 border-b border-gray-100">
          {title    && <h3 className="font-semibold text-gray-800 text-base">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function ComingSoon({ icon: Icon, title, description }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">{description}</p>
      <span className="inline-block mt-4 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full">
        Em breve
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Meu Perfil
// ═══════════════════════════════════════════════════════════════
function SecaoPerfil() {
  const { user, profile } = useAuth();
  const [form, setForm]   = useState({ nome: profile?.nome || '' });
  const [busy, setBusy]   = useState(false);

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome não pode ficar vazio.');
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nome: form.nome.trim() })
      .eq('id', profile?.id);
    setBusy(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Perfil atualizado!');
  }

  return (
    <>
      <SectionCard title="Informações pessoais" subtitle="Seu nome de exibição no sistema">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-unicri-navy flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {profile?.nome?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="font-semibold text-gray-800">{profile?.nome}</div>
            <div className="text-sm text-gray-400">{user?.email}</div>
            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PERFIL_BADGE[profile?.perfil]}`}>
              <Shield size={10} /> {profile?.perfil}
            </span>
          </div>
        </div>
        <form onSubmit={salvar} className="space-y-4 max-w-sm">
          <div>
            <label className="label">Nome completo</label>
            <input className="input" value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input bg-gray-50 cursor-not-allowed" value={user?.email || ''} readOnly />
            <p className="text-xs text-gray-400 mt-1">Para alterar o e-mail, entre em contato com o administrador.</p>
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            <Save size={14} /> {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Status da conta">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${profile?.ativo ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm font-medium text-gray-700">
            {profile?.ativo ? 'Conta ativa' : 'Conta desativada'}
          </span>
        </div>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Senha e Segurança
// ═══════════════════════════════════════════════════════════════
function SecaoSeguranca() {
  const [form, setForm]       = useState({ atual: '', nova: '', confirmar: '' });
  const [mostrar, setMostrar] = useState({ atual: false, nova: false });
  const [busy, setBusy]       = useState(false);

  async function trocarSenha(e) {
    e.preventDefault();
    if (form.nova.length < 8) return toast.error('A nova senha deve ter ao menos 8 caracteres.');
    if (form.nova !== form.confirmar) return toast.error('As senhas não coincidem.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: form.nova });
    setBusy(false);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Senha alterada com sucesso!'); setForm({ atual: '', nova: '', confirmar: '' }); }
  }

  const F = (k) => ({
    value: form[k],
    onChange: e => setForm(f => ({ ...f, [k]: e.target.value })),
  });

  return (
    <>
      <SectionCard title="Alterar senha" subtitle="Use uma senha forte com no mínimo 8 caracteres">
        <form onSubmit={trocarSenha} className="space-y-4 max-w-sm">
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <input className="input pr-10" type={mostrar.nova ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres" {...F('nova')} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setMostrar(m => ({ ...m, nova: !m.nova }))}>
                {mostrar.nova ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input className="input" type={mostrar.nova ? 'text' : 'password'}
              placeholder="Repita a senha" {...F('confirmar')} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            <Lock size={14} /> {busy ? 'Alterando…' : 'Alterar senha'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Autenticação de dois fatores" subtitle="Adiciona uma camada extra de segurança à sua conta">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <Smartphone size={18} className="text-gray-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Autenticador TOTP</div>
              <div className="text-xs text-gray-400">Ainda não configurado</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-600 rounded-full">Em breve</span>
        </div>
      </SectionCard>

      <SectionCard title="Sessões ativas">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <Globe size={16} className="text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700">Sessão atual</div>
            <div className="text-xs text-gray-400">Navegador web</div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </div>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Dados da Empresa
// ═══════════════════════════════════════════════════════════════
function SecaoEmpresa() {
  const { empresaAtiva, setEmpresaAtiva, fetchEmpresas } = useAuth();
  const [form, setForm] = useState({ nome: empresaAtiva?.nome || '', cnpj: empresaAtiva?.cnpj || '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({ nome: empresaAtiva?.nome || '', cnpj: empresaAtiva?.cnpj || '' });
  }, [empresaAtiva?.id]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome é obrigatório.');
    setBusy(true);
    try {
      const updated = await api.empresas.atualizar(empresaAtiva.id, {
        nome: form.nome.trim(),
        cnpj: form.cnpj.replace(/\D/g, '') || null,
      });
      setEmpresaAtiva({ ...empresaAtiva, ...updated });
      await fetchEmpresas();
      toast.success('Empresa atualizada!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!empresaAtiva) {
    return (
      <div className="card p-8 text-center text-gray-400">
        Selecione uma empresa no menu lateral.
      </div>
    );
  }

  return (
    <SectionCard title="Dados da empresa" subtitle="Informações exibidas em relatórios e documentos">
      <form onSubmit={salvar} className="space-y-4 max-w-sm">
        <div>
          <label className="label">Razão social / Nome *</label>
          <input className="input" value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
        </div>
        <div>
          <label className="label">CNPJ</label>
          <input className="input" value={form.cnpj}
            onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
            placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label className="label">ID da empresa</label>
          <input className="input bg-gray-50 cursor-not-allowed text-xs text-gray-400"
            value={empresaAtiva.id} readOnly />
        </div>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          <Save size={14} /> {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Usuários e Acessos (ex-GestaoAcessos)
// ═══════════════════════════════════════════════════════════════
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const apiBase = import.meta.env.VITE_API_URL ?? '';
  return { apiBase, headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }};
}

function SecaoUsuarios() {
  const { profile: me, empresaAtiva } = useAuth();
  const [users, setUsers]               = useState([]);
  const [usersEmpresa, setUsersEmpresa] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [showVincular, setShowVincular] = useState(false);
  const [tab, setTab]                   = useState('global');

  async function carregar() {
    setLoading(true);
    try {
      const { apiBase, headers } = await getAuthHeaders();
      const res = await fetch(`${apiBase}/api/admin/users`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (e) { toast.error('Erro: ' + e.message); }
    setLoading(false);
  }

  async function carregarEmpresa() {
    if (!empresaAtiva) return;
    try {
      const data = await api.empresas.usuarios.listar(empresaAtiva.id);
      setUsersEmpresa(data || []);
    } catch (e) { toast.error(e.message); }
  }

  useEffect(() => { carregar(); }, []);
  useEffect(() => { carregarEmpresa(); }, [empresaAtiva?.id]);

  async function toggleAtivo(user) {
    if (user.id === me?.id) { toast.error('Não pode desativar sua própria conta.'); return; }
    const { error } = await supabase.from('profiles').update({ ativo: !user.ativo }).eq('id', user.id);
    if (error) toast.error(error.message);
    else { toast.success(user.ativo ? 'Desativado.' : 'Reativado.'); carregar(); }
  }

  async function changePerfil(userId, newPerfil) {
    const { error } = await supabase.from('profiles').update({ perfil: newPerfil }).eq('id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Perfil atualizado!'); carregar(); }
  }

  async function reenviar(user) {
    try {
      const { apiBase, headers } = await getAuthHeaders();
      const res = await fetch(`${apiBase}/api/admin/resend-invite`, {
        method: 'POST', headers, body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Convite reenviado para ${user.email}`);
    } catch (e) { toast.error(e.message); }
  }

  async function desvincular(ue) {
    try {
      await api.empresas.usuarios.atualizar(empresaAtiva.id, ue.profiles?.id, { ativo: false });
      toast.success('Acesso revogado.'); carregarEmpresa();
    } catch (e) { toast.error(e.message); }
  }

  async function alterarPerfilEmpresa(ue, perfil) {
    try {
      await api.empresas.usuarios.atualizar(empresaAtiva.id, ue.profiles?.id, { perfil });
      toast.success('Perfil atualizado!'); carregarEmpresa();
    } catch (e) { toast.error(e.message); }
  }

  const ativos    = users.filter(u => u.ativo).length;
  const pendentes = users.filter(u => !u.confirmado).length;

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-unicri-orange">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-unicri-navy">{users.length}</div>
        </div>
        <div className="card p-4 border-l-4 border-emerald-400">
          <div className="text-xs text-gray-500 mb-1">Ativos</div>
          <div className="text-2xl font-bold text-emerald-600">{ativos}</div>
        </div>
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="text-xs text-gray-500 mb-1">Pendentes</div>
          <div className="text-2xl font-bold text-amber-500">{pendentes}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'global',  label: 'Usuários do sistema' },
            { id: 'empresa', label: empresaAtiva?.nome || 'Esta empresa' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'empresa') carregarEmpresa(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${tab === t.id ? 'bg-white text-unicri-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'global'
          ? <button className="btn-primary text-sm" onClick={() => setShowInvite(true)}><Plus size={14}/> Convidar</button>
          : <button className="btn-secondary text-sm" onClick={() => setShowVincular(true)}><Link2 size={14}/> Vincular</button>
        }
      </div>

      {/* Tabela global */}
      {tab === 'global' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/50 ${!u.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-unicri-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{u.nome}</div>
                        <div className="text-[11px] text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.id === me?.id
                      ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${PERFIL_BADGE[u.perfil]}`}>
                          <Shield size={10}/>{PERFIS.find(p=>p.value===u.perfil)?.label}
                        </span>
                      : <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          value={u.perfil} onChange={e => changePerfil(u.id, e.target.value)}>
                          {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {!u.confirmado
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock size={11}/> Pendente</span>
                      : u.ativo
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><UserCheck size={11}/> Ativo</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400"><UserX size={11}/> Inativo</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      {!u.confirmado && (
                        <button onClick={() => reenviar(u)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">
                          Reenviar
                        </button>
                      )}
                      {u.id !== me?.id && (
                        <button onClick={() => toggleAtivo(u)}
                          className={`text-xs px-2.5 py-1 rounded-lg border ${u.ativo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
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

      {/* Tabela por empresa */}
      {tab === 'empresa' && (
        !empresaAtiva ? (
          <div className="card p-8 text-center text-gray-400">Selecione uma empresa.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Perfil nesta empresa</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersEmpresa.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Nenhum usuário vinculado.</td></tr>
                ) : usersEmpresa.map(ue => {
                  const u = ue.profiles;
                  if (!u) return null;
                  return (
                    <tr key={ue.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-unicri-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.nome?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-xs">{u.nome}</div>
                            <div className="text-[11px] text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          value={ue.perfil} onChange={e => alterarPerfilEmpresa(ue, e.target.value)}>
                          {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== me?.id && (
                          <button onClick={() => desvincular(ue)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                            <Unlink size={11} className="inline mr-1"/>Revogar
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
        <InviteForm empresaId={empresaAtiva?.id} onClose={() => setShowInvite(false)} onSaved={carregar} />
      </Modal>
      <Modal open={showVincular} onClose={() => setShowVincular(false)} title="Vincular usuário à empresa" size="sm">
        <VincularForm empresaId={empresaAtiva?.id} usersGlobais={users} usersVinculados={usersEmpresa}
          onClose={() => setShowVincular(false)} onSaved={carregarEmpresa} />
      </Modal>
    </div>
  );
}

function InviteForm({ onClose, onSaved, empresaId }) {
  const [form, setForm] = useState({ email: '', nome: '', perfil: 'VISUALIZACAO' });
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { apiBase, headers } = await getAuthHeaders();
    const body = { ...form, empresa_id: empresaId };
    const res = await fetch(`${apiBase}/api/admin/invite-user`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) toast.error(data.error);
    else { toast.success(data.message || `Convite enviado para ${form.email}`); onSaved(); onClose(); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Nome completo *</label>
        <input className="input" value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} required /></div>
      <div><label className="label">E-mail *</label>
        <input className="input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required /></div>
      <div><label className="label">Perfil</label>
        <select className="input" value={form.perfil} onChange={e => setForm(f=>({...f,perfil:e.target.value}))}>
          {PERFIS.map(p=><option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
        </select></div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          <Mail size={14}/> {busy ? 'Enviando…' : 'Enviar convite'}
        </button>
      </div>
    </form>
  );
}

function VincularForm({ empresaId, usersGlobais, usersVinculados, onClose, onSaved }) {
  const [userId, setUserId] = useState('');
  const [perfil, setPerfil] = useState('VISUALIZACAO');
  const [busy, setBusy]     = useState(false);
  const vinculadosIds = new Set((usersVinculados||[]).map(ue=>ue.profiles?.id));
  const disponíveis   = (usersGlobais||[]).filter(u=>!vinculadosIds.has(u.id));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await api.empresas.usuarios.vincular(empresaId,{user_id:userId,perfil}); toast.success('Vinculado!'); onSaved(); onClose(); }
    catch(err) { toast.error(err.message); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Usuário *</label>
        <select className="input" value={userId} onChange={e=>setUserId(e.target.value)} required>
          <option value="">Selecione…</option>
          {disponíveis.map(u=><option key={u.id} value={u.id}>{u.nome} ({u.email})</option>)}
        </select></div>
      <div><label className="label">Perfil nesta empresa</label>
        <select className="input" value={perfil} onChange={e=>setPerfil(e.target.value)}>
          {PERFIS.map(p=><option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
        </select></div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={busy||!userId} className="btn-primary disabled:opacity-60">
          <Link2 size={14}/> {busy?'Vinculando…':'Vincular'}
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Logs do Sistema
// ═══════════════════════════════════════════════════════════════
const ACTION_STYLE = {
  INSERT: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};
const LOG_TABLES = ['lancamentos','contas_pagar','contas_receber','clientes','fornecedores','profiles'];
const PAGE_SIZE  = 20;

function SecaoLogs() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filters, setFilters] = useState({ action: '', table_name: '', search: '' });

  const load = useCallback(async (pg = 0, f = filters) => {
    setLoading(true);
    try {
      let q = supabase.from('audit_logs')
        .select('*, profiles(nome)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1);
      if (f.action)     q = q.eq('action', f.action);
      if (f.table_name) q = q.eq('table_name', f.table_name);
      if (f.search)     q = q.or(`record_id.ilike.%${f.search}%`);
      const { data, count } = await q;
      setLogs(data || []); setTotal(count || 0); setPage(pg);
    } catch(e) { toast.error(e.message); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(0, filters); }, []);

  function aplicar() { load(0, filters); }

  return (
    <div>
      {/* Filtros */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-[11px]">Ação</label>
          <select className="input h-8 text-xs py-0" value={filters.action}
            onChange={e => setFilters(f=>({...f,action:e.target.value}))}>
            <option value="">Todas</option>
            {['INSERT','UPDATE','DELETE'].map(a=><option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-[11px]">Tabela</label>
          <select className="input h-8 text-xs py-0" value={filters.table_name}
            onChange={e => setFilters(f=>({...f,table_name:e.target.value}))}>
            <option value="">Todas</option>
            {LOG_TABLES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn-primary h-8 text-xs" onClick={aplicar}><Filter size={12}/> Filtrar</button>
        <button className="btn-secondary h-8 text-xs" onClick={() => { const f={action:'',table_name:'',search:''}; setFilters(f); load(0,f); }}>
          <RefreshCw size={12}/> Limpar
        </button>
        <div className="ml-auto text-xs text-gray-400">{total} registros</div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Tabela</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">ID do registro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum log encontrado.</td></tr>
            ) : logs.map(l => (
              <>
                <tr key={l.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setExpanded(expanded===l.id?null:l.id)}>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{l.profiles?.nome ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-600">{l.table_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${ACTION_STYLE[l.action]||'bg-gray-100 text-gray-500'}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-400 truncate max-w-[120px]">{l.record_id}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    <ChevronDown size={13} className={`transition-transform ${expanded===l.id?'rotate-180':''}`}/>
                  </td>
                </tr>
                {expanded === l.id && (
                  <tr key={l.id+'_detail'} className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      <pre className="text-[11px] text-gray-600 bg-white rounded-lg p-3 overflow-x-auto max-h-48 border border-gray-100">
                        {JSON.stringify({ old: l.old_value, new: l.new_value }, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {/* Paginação */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button disabled={page === 0} onClick={() => load(page-1)} className="btn-secondary text-xs disabled:opacity-40">← Anterior</button>
            <span className="text-xs text-gray-400">Página {page+1} de {Math.ceil(total/PAGE_SIZE)}</span>
            <button disabled={(page+1)*PAGE_SIZE >= total} onClick={() => load(page+1)} className="btn-secondary text-xs disabled:opacity-40">Próxima →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Notificações
// ═══════════════════════════════════════════════════════════════
function SecaoNotificacoes() {
  const [prefs, setPrefs] = useState({
    vencimento_hoje: true, vencimento_semana: true,
    novos_lancamentos: false, relatorio_mensal: true,
    email: true, push: false,
  });
  const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const Toggle = ({ k, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {desc && <div className="text-xs text-gray-400">{desc}</div>}
      </div>
      <button onClick={() => toggle(k)}
        className={`w-10 h-5 rounded-full transition-colors relative ${prefs[k] ? 'bg-unicri-orange' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs[k] ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <>
      <SectionCard title="Alertas financeiros" subtitle="Quando você quer ser avisado">
        <Toggle k="vencimento_hoje"   label="Contas vencendo hoje"       desc="Aviso diário pela manhã" />
        <Toggle k="vencimento_semana" label="Contas nos próximos 7 dias" desc="Resumo semanal" />
        <Toggle k="novos_lancamentos" label="Novos lançamentos"          desc="Toda vez que um registro for criado" />
        <Toggle k="relatorio_mensal"  label="Relatório mensal"           desc="DRE resumido no primeiro dia do mês" />
      </SectionCard>
      <SectionCard title="Canais de entrega">
        <Toggle k="email" label="E-mail"              desc="Notificações enviadas ao seu e-mail" />
        <Toggle k="push"  label="Notificação no app"  desc="Alertas no navegador (em breve)" />
      </SectionCard>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">As preferências de notificação ainda são salvas localmente. A integração com e-mail estará disponível em breve.</p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Plano e Faturamento
// ═══════════════════════════════════════════════════════════════
function SecaoPlano() {
  const plans = [
    { id: 'starter', name: 'Starter', price: 'R$ 0', period: 'grátis', current: true,
      features: ['1 empresa', 'Até 3 usuários', 'Módulos financeiros básicos', 'Suporte por e-mail'] },
    { id: 'pro', name: 'Pro', price: 'R$ 149', period: '/mês', current: false,
      features: ['Empresas ilimitadas', 'Usuários ilimitados', 'Relatórios avançados', 'API de integração', 'Suporte prioritário'] },
    { id: 'enterprise', name: 'Enterprise', price: 'Sob consulta', period: '', current: false,
      features: ['Tudo do Pro', 'SSO / SAML', 'SLA garantido', 'Implantação dedicada', 'Treinamento incluso'] },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {plans.map(plan => (
          <div key={plan.id} className={`card p-5 relative ${plan.current ? 'ring-2 ring-unicri-orange' : ''}`}>
            {plan.current && (
              <span className="absolute -top-3 left-4 bg-unicri-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                PLANO ATUAL
              </span>
            )}
            <div className="mb-3">
              <div className="font-bold text-gray-800">{plan.name}</div>
              <div className="text-2xl font-bold text-unicri-navy mt-1">
                {plan.price}<span className="text-sm font-normal text-gray-400">{plan.period}</span>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <Check size={12} className="text-unicri-orange shrink-0" /> {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button className="w-full btn-primary text-sm py-1.5">Fazer upgrade</button>
            )}
          </div>
        ))}
      </div>
      <SectionCard title="Histórico de faturamento">
        <div className="text-sm text-gray-400 py-4 text-center">
          Nenhuma fatura disponível no plano gratuito.
        </div>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Integrações
// ═══════════════════════════════════════════════════════════════
function SecaoIntegracoes() {
  const integracoes = [
    { nome: 'API REST',        desc: 'Integre com qualquer sistema via API',      icon: Zap,     status: 'disponível' },
    { nome: 'Webhooks',        desc: 'Receba eventos em tempo real no seu sistema', icon: Globe,  status: 'breve' },
    { nome: 'Banco do Brasil', desc: 'Conciliação bancária automática',            icon: Building2, status: 'breve' },
    { nome: 'Nota Fiscal',     desc: 'Emissão e importação de NF-e / NFS-e',      icon: Package, status: 'breve' },
    { nome: 'WhatsApp',        desc: 'Alertas de vencimento via WhatsApp',         icon: Smartphone, status: 'breve' },
    { nome: 'E-mail SMTP',     desc: 'Envio de relatórios por e-mail próprio',     icon: Mail,   status: 'breve' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {integracoes.map(item => (
        <div key={item.nome} className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-unicri-cream rounded-xl flex items-center justify-center shrink-0">
            <item.icon size={18} className="text-unicri-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 text-sm">{item.nome}</div>
            <div className="text-xs text-gray-400 truncate">{item.desc}</div>
          </div>
          {item.status === 'disponível'
            ? <button className="btn-primary text-xs py-1 px-3">Configurar</button>
            : <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full whitespace-nowrap">Em breve</span>
          }
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEÇÃO: Aparência
// ═══════════════════════════════════════════════════════════════
function SecaoAparencia() {
  const temas = [
    { id: 'light', label: 'Claro',         bg: 'bg-white',     border: 'border-gray-200' },
    { id: 'dark',  label: 'Escuro',        bg: 'bg-gray-900',  border: 'border-gray-700' },
    { id: 'auto',  label: 'Sistema',       bg: 'bg-gradient-to-r from-white to-gray-900', border: 'border-gray-300' },
  ];
  const [tema, setTema] = useState('light');

  return (
    <>
      <SectionCard title="Tema" subtitle="Aparência da interface do sistema">
        <div className="flex gap-3">
          {temas.map(t => (
            <button key={t.id} onClick={() => setTema(t.id)}
              className={`flex-1 rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all
                ${tema === t.id ? 'border-unicri-orange' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`w-full h-10 rounded-lg ${t.bg} border ${t.border}`} />
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
              {tema === t.id && <Check size={12} className="text-unicri-orange" />}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Os temas escuro e automático estão em desenvolvimento.
        </div>
      </SectionCard>
      <SectionCard title="Densidade" subtitle="Espaçamento das informações nas tabelas">
        {['Compacta', 'Normal', 'Confortável'].map((d, i) => (
          <label key={d} className="flex items-center gap-3 py-2 cursor-pointer">
            <input type="radio" name="densidade" defaultChecked={i===1} className="accent-unicri-orange" />
            <span className="text-sm text-gray-700">{d}</span>
          </label>
        ))}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: Configuracoes
// ═══════════════════════════════════════════════════════════════
const SECTION_COMPONENTS = {
  perfil:       SecaoPerfil,
  seguranca:    SecaoSeguranca,
  empresa:      SecaoEmpresa,
  usuarios:     SecaoUsuarios,
  logs:         SecaoLogs,
  notificacoes: SecaoNotificacoes,
  plano:        SecaoPlano,
  integracoes:  SecaoIntegracoes,
  aparencia:    SecaoAparencia,
};

const SECTION_TITLES = {
  perfil:       'Meu Perfil',
  seguranca:    'Senha e Segurança',
  empresa:      'Dados da Empresa',
  usuarios:     'Usuários e Acessos',
  logs:         'Logs do Sistema',
  notificacoes: 'Notificações',
  plano:        'Plano e Faturamento',
  integracoes:  'Integrações',
  aparencia:    'Aparência',
};

export default function Configuracoes() {
  const { isAdmin } = useAuth();
  const [section, setSection] = useState('perfil');

  // Obtém o hash da URL para deep-link
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && SECTION_COMPONENTS[hash]) setSection(hash);
  }, []);

  const Content = SECTION_COMPONENTS[section] || (() => null);

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar de configurações */}
      <aside className="w-56 shrink-0">
        <div className="card p-2 sticky top-0">
          {SECTIONS.map(group => {
            const visible = group.items.filter(i => !i.adminOnly || isAdmin);
            if (visible.length === 0) return null;
            return (
              <div key={group.group} className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {group.group}
                </div>
                {visible.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSection(item.id); window.location.hash = item.id; }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                      ${section === item.id
                        ? 'bg-unicri-orange/10 text-unicri-orange'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span>{item.label}</span>
                    {section === item.id && <ChevronRight size={12} className="ml-auto" />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Conteúdo da seção */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-gray-800 mb-5">{SECTION_TITLES[section]}</h2>
        <Content />
      </div>
    </div>
  );
}
