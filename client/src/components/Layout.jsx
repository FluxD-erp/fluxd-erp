import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown, ArrowLeftRight,
  Users, Truck, FileText, BarChart2, Menu, X, ChevronRight,
  Bell, Settings, LogOut, AlertTriangle, CalendarDays,
  Building2, ChevronDown, Plus, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Financeiro', icon: ArrowLeftRight, children: [
      { label: 'Lançamentos',     icon: FileText,      to: '/lancamentos' },
      { label: 'Contas a Pagar',  icon: TrendingDown,  to: '/contas-pagar' },
      { label: 'Contas a Receber',icon: TrendingUp,    to: '/contas-receber' },
      { label: 'Fluxo de Caixa',  icon: BarChart2,     to: '/fluxo-caixa' },
      { label: 'Prog. da Semana', icon: CalendarDays,  to: '/programacao-semana' },
    ]
  },
  {
    label: 'Cadastros', icon: Users, children: [
      { label: 'Clientes',       icon: Users,     to: '/clientes' },
      { label: 'Fornecedores',   icon: Truck,     to: '/fornecedores' },
      { label: 'Plano de Contas',icon: FileText,  to: '/plano-contas' },
    ]
  },
  { label: 'Passivos Especiais', icon: AlertTriangle, to: '/passivos' },
  { label: 'Relatórios',         icon: BarChart2,     to: '/relatorios' },
];

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
        ${isActive ? 'bg-unicri-orange text-white shadow-md shadow-unicri-orange/30' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
      }
    >
      <item.icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

/** Dropdown seletor de empresa na sidebar */
function EmpresaSwitcher({ collapsed }) {
  const { empresas, empresaAtiva, setEmpresaAtiva } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group"
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
            <button
              key={emp.id}
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
              {empresaAtiva?.id === emp.id && (
                <Check size={13} className="text-unicri-orange shrink-0" />
              )}
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

export default function Layout({ children }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut }        = useAuth();
  const navigate                    = useNavigate();

  const sidebar = (
    <div className={`flex flex-col h-full bg-unicri-navy transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-unicri-orange rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-base leading-tight">FluxD</div>
            <div className="text-unicri-orange text-xs font-medium">Sistema Financeiro</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-gray-400 hover:text-white transition-colors hidden lg:block"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Seletor de empresa */}
      <EmpresaSwitcher collapsed={collapsed} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item, i) => (
          <NavItem key={i} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer — usuário logado + logout */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {!collapsed && profile && (
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
          {!collapsed && <span>Configurações</span>}
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 shrink-0">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-4 shrink-0">
          <button className="lg:hidden text-gray-500" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="text-xs text-gray-400 font-medium hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-unicri-orange rounded-full text-white text-[10px] flex items-center justify-center font-bold">3</span>
          </button>
          <div className="w-8 h-8 bg-unicri-navy rounded-full flex items-center justify-center text-white text-xs font-bold" title={profile?.nome}>
            {profile?.nome?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
