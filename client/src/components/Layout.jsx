import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, ArrowLeftRight,
  Users, Truck, FileText, BarChart2, Menu, X, ChevronRight,
  Bell, Settings, LogOut, AlertTriangle, CalendarDays,
  Building2, ChevronDown, Plus, Check, User, ExternalLink, Zap, BanknoteIcon,
  Home, CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, fmt } from '../services/api';

// ─────────────────────────────────────────────
// Navegação principal da sidebar
// ─────────────────────────────────────────────
const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Financeiro', icon: ArrowLeftRight, children: [
      { label: 'Lançamentos',      icon: FileText,      to: '/lancamentos' },
      { label: 'Contas a Pagar',   icon: TrendingDown,  to: '/contas-pagar' },
      { label: 'Contas a Receber', icon: TrendingUp,    to: '/contas-receber' },
      { label: 'Fluxo de Caixa',   icon: BarChart2,     to: '/fluxo-caixa' },
      { label: 'Prog. da Semana',  icon: CalendarDays,  to: '/programacao-semana' },
      { label: 'Conciliação',      icon: BanknoteIcon,  to: '/conciliacao' },
    ],
  },
  {
    label: 'Cadastros', icon: Users, children: [
      { label: 'Clientes',          icon: Users,        to: '/clientes' },
      { label: 'Fornecedores',      icon: Truck,        to: '/fornecedores' },
      { label: 'Contas Bancárias',  icon: BanknoteIcon, to: '/contas-bancarias' },
      { label: 'Plano de Contas',   icon: FileText,     to: '/plano-contas' },
    ],
  },
  { label: 'Passivos Especiais', icon: AlertTriangle, to: '/passivos' },
  { label: 'Relatórios',         icon: BarChart2,     to: '/relatorios' },
  { label: 'Planos',             icon: Zap,           to: '/planos' },
];

// ─────────────────────────────────────────────
// Hook: fecha dropdown ao clicar fora
// ─────────────────────────────────────────────
function useClickOutside(ref, fn) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) fn();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, fn]);
}

// ─────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────
function NavItem({ item, collapsed, depth = 0 }) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => location.pathname === c.to)
  );

  if (item.adminOnly && !isAdmin) return null;

  if (item.children) {
    const active = item.children.some(c => location.pathname === c.to);
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${active ? 'bg-unicri-orange/10 text-unicri-orange' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
        >
          <item.icon size={18} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-4 mt-0.5 border-l border-white/10 pl-3 space-y-0.5">
            {item.children.map(child => (
              <NavItem key={child.to} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? 'bg-unicri-orange text-white shadow-md shadow-unicri-orange/30'
          : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
      }
    >
      <item.icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

// ─────────────────────────────────────────────
// EmpresaSwitcher — sidebar
// ─────────────────────────────────────────────
function EmpresaSwitcher({ collapsed }) {
  const { empresas, empresaAtiva, setEmpresaAtiva } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  if (collapsed) {
    return (
      <div className="px-3 py-2 border-b border-white/10">
        <div
          title={empresaAtiva?.nome ?? 'Selecionar empresa'}
          className="w-8 h-8 rounded-lg bg-unicri-orange/20 flex items-center justify-center cursor-pointer hover:bg-unicri-orange/30 transition-colors"
          onClick={() => !empresaAtiva && navigate('/setup')}
        >
          <Building2 size={16} className="text-unicri-orange" />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="px-3 py-2 border-b border-white/10 relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="w-7 h-7 rounded-md bg-unicri-orange/20 flex items-center justify-center shrink-0">
          <Building2 size={14} className="text-unicri-orange" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          {empresaAtiva ? (
            <>
              <div className="text-[11px] text-gray-400 leading-none mb-0.5">Empresa ativa</div>
              <div className="text-xs font-semibold text-white truncate">{empresaAtiva.nome}</div>
            </>
          ) : (
            <div className="text-xs font-semibold text-amber-400">Selecionar empresa…</div>
          )}
        </div>
        <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
          {empresas.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">Nenhuma empresa</div>
          )}
          {empresas.map(emp => (
            <button key={emp.id}
              onClick={() => { setEmpresaAtiva(emp); setOpen(false); navigate('/'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-unicri-orange/10 flex items-center justify-center shrink-0">
                <Building2 size={12} className="text-unicri-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">{emp.nome}</div>
                {emp.cnpj && <div className="text-[10px] text-gray-400">{emp.cnpj}</div>}
              </div>
              {empresaAtiva?.id === emp.id && <Check size={13} className="text-unicri-orange shrink-0" />}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); navigate('/setup'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-unicri-orange"
            >
              <Plus size={13} />
              <span className="text-xs font-semibold">Nova empresa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// NotificationDropdown — sino no header
// ─────────────────────────────────────────────
function NotificationDropdown() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen]       = useState(false);
  const [hoje, setHoje]       = useState([]);   // vencendo hoje
  const [atrasadas, setAtrasadas] = useState([]); // vencidas
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const buscar = useCallback(async () => {
    if (!empresaAtiva) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const todas = await api.financeiro.contasPagar({ status: 'ABERTA' });
      const parciais = await api.financeiro.contasPagar({ status: 'PARCIAL' });
      const vencidas = await api.financeiro.contasPagar({ status: 'VENCIDA' });

      const abertas = [...(todas || []), ...(parciais || [])];

      setHoje(abertas.filter(c => c.data_vencimento === today));
      setAtrasadas([
        ...abertas.filter(c => c.data_vencimento < today),
        ...(vencidas || []),
      ].slice(0, 5));
    } catch {
      // silencioso — sem empresa selecionada não carrega
    } finally {
      setLoading(false);
    }
  }, [empresaAtiva]);

  // Busca quando monta e quando a empresa muda
  useEffect(() => { buscar(); }, [buscar]);

  const total = hoje.length + atrasadas.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) buscar(); }}
        className="relative text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        <Bell size={20} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Cabeçalho */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-800 text-sm">Notificações</div>
            {total > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full">
                {total} pendente{total > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Carregando…</div>
            ) : total === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check size={18} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">Tudo em dia!</p>
                <p className="text-xs text-gray-400 mt-0.5">Nenhuma conta vencendo hoje.</p>
              </div>
            ) : (
              <>
                {/* Vencendo hoje */}
                {hoje.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                      Vencendo hoje — {hoje.length}
                    </div>
                    {hoje.map(c => (
                      <button key={c.id}
                        onClick={() => { navigate('/contas-pagar'); setOpen(false); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors text-left border-b border-gray-50"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{c.descricao}</div>
                          {c.fornecedor_nome && (
                            <div className="text-[11px] text-gray-400 truncate">{c.fornecedor_nome}</div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-amber-600 shrink-0">{fmt(c.valor_original - (c.valor_pago || 0))}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Em atraso */}
                {atrasadas.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">
                      Em atraso — {atrasadas.length}
                    </div>
                    {atrasadas.map(c => (
                      <button key={c.id}
                        onClick={() => { navigate('/contas-pagar'); setOpen(false); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-red-50/60 transition-colors text-left border-b border-gray-50"
                      >
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{c.descricao}</div>
                          <div className="text-[11px] text-red-400">
                            {new Date(c.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-red-500 shrink-0">{fmt(c.valor_original - (c.valor_pago || 0))}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-4 py-2.5 border-t border-gray-100">
            <button
              onClick={() => { navigate('/contas-pagar'); setOpen(false); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-unicri-orange hover:text-unicri-orange-dark transition-colors"
            >
              Ver todas as contas a pagar <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// UserMenuDropdown — avatar no header
// ─────────────────────────────────────────────
const PERFIL_BADGE = {
  ADMIN:        'bg-red-100 text-red-600',
  FINANCEIRO:   'bg-unicri-orange/10 text-unicri-orange',
  VISUALIZACAO: 'bg-gray-100 text-gray-500',
};

function UserMenuDropdown() {
  const { profile, empresas, empresaAtiva, setEmpresaAtiva, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  function go(path) { navigate(path); setOpen(false); }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-unicri-navy rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent hover:ring-unicri-orange/30 transition-all">
          {profile?.nome?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <ChevronDown size={13} className={`text-gray-400 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          {/* Identidade do usuário */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-unicri-navy rounded-full flex items-center justify-center text-white font-bold shrink-0">
                {profile?.nome?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">{profile?.nome}</div>
                <div className="text-xs text-gray-400 truncate">{profile?.email ?? ''}</div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${PERFIL_BADGE[profile?.perfil] ?? 'bg-gray-100 text-gray-500'}`}>
              {profile?.perfil}
            </span>
          </div>

          {/* Ações principais */}
          <div className="py-1">
            <MenuItem icon={User}     label="Meu Perfil"     onClick={() => go('/configuracoes#perfil')} />
            <MenuItem icon={Settings} label="Configurações"  onClick={() => go('/configuracoes')} />
          </div>

          {/* Empresas */}
          <div className="border-t border-gray-100 py-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Trocar empresa
            </div>
            {empresas.map(emp => (
              <button key={emp.id}
                onClick={() => { setEmpresaAtiva(emp); setOpen(false); navigate('/'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-unicri-orange/10 flex items-center justify-center shrink-0">
                  <Building2 size={12} className="text-unicri-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{emp.nome}</div>
                  {emp.cnpj && <div className="text-[10px] text-gray-400">{emp.cnpj}</div>}
                </div>
                {empresaAtiva?.id === emp.id && (
                  <Check size={13} className="text-unicri-orange shrink-0" />
                )}
              </button>
            ))}
            <button
              onClick={() => go('/setup')}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-unicri-orange"
            >
              <div className="w-6 h-6 rounded-md border border-dashed border-unicri-orange/40 flex items-center justify-center shrink-0">
                <Plus size={12} />
              </div>
              <span className="text-xs font-semibold">Nova empresa</span>
            </button>
          </div>

          {/* Sair */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut size={15} />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left
        ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:text-gray-800'}`}
    >
      <Icon size={15} className="shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Bottom Navigation (mobile)
// ─────────────────────────────────────────────
function BottomNav({ onOpenMenu }) {
  const location = useLocation();
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-center justify-around px-2 py-1">
        <NavLink to="/" className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]
          ${isActive ? 'text-unicri-orange' : 'text-gray-400'}`}>
          <Home size={22} />
          <span className="text-[10px] font-medium">Início</span>
        </NavLink>

        <NavLink to="/lancamentos" className={() =>
          `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]
          ${isActive('/lancamentos') ? 'text-unicri-orange' : 'text-gray-400'}`}>
          <ArrowLeftRight size={22} />
          <span className="text-[10px] font-medium">Financeiro</span>
        </NavLink>

        <NavLink to="/contas-pagar" className={() =>
          `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]
          ${isActive('/contas-pagar') || isActive('/contas-receber') ? 'text-unicri-orange' : 'text-gray-400'}`}>
          <CreditCard size={22} />
          <span className="text-[10px] font-medium">Contas</span>
        </NavLink>

        <NavLink to="/configuracoes" className={() =>
          `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]
          ${isActive('/configuracoes') ? 'text-unicri-orange' : 'text-gray-400'}`}>
          <Settings size={22} />
          <span className="text-[10px] font-medium">Config.</span>
        </NavLink>

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px] text-gray-400 active:text-unicri-orange"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// Layout principal
// ─────────────────────────────────────────────
export default function Layout({ children }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut }        = useAuth();
  const navigate                    = useNavigate();

  // Fecha sidebar mobile ao navegar
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sidebarContent = (isMobile = false) => (
    <div className={`flex flex-col h-full bg-unicri-navy transition-all duration-300
      ${isMobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-unicri-orange rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp size={20} className="text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div>
            <div className="text-white font-bold text-base leading-tight">FluxD</div>
            <div className="text-unicri-orange text-xs font-medium">Sistema Financeiro</div>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Seletor de empresa */}
      <EmpresaSwitcher collapsed={!isMobile && collapsed} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item, i) => (
          <NavItem key={i} item={item} collapsed={!isMobile && collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {(!collapsed || isMobile) && profile && (
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-semibold text-white truncate">{profile.nome}</div>
            <div className="text-[10px] text-gray-400 truncate">{profile.perfil}</div>
          </div>
        )}
        <button
          onClick={() => navigate('/configuracoes')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Settings size={18} />
          {(!collapsed || isMobile) && <span>Configurações</span>}
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          {(!collapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">{sidebarContent(false)}</div>

      {/* Mobile sidebar — slide from left com backdrop */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300
        ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300
            ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div className={`absolute left-0 top-0 bottom-0 transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent(true)}
        </div>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0 safe-top">
          <button className="lg:hidden text-gray-500 p-1 -ml-1" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>

          <div className="flex-1" />

          {/* Data — só desktop */}
          <div className="text-xs text-gray-400 font-medium hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          {/* Notificações */}
          <NotificationDropdown />

          {/* Separador */}
          <div className="w-px h-5 bg-gray-200" />

          {/* Menu do usuário */}
          <UserMenuDropdown />
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom Navigation — só mobile */}
      <BottomNav onOpenMenu={() => setMobileOpen(true)} />
    </div>
  );
}
