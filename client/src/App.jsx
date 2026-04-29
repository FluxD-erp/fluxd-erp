import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BRAND } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Páginas públicas
import Login        from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';
import SetupEmpresa from './pages/SetupEmpresa';

// Páginas financeiras (qualquer usuário ativo)
import Dashboard        from './pages/Dashboard';
import Lancamentos      from './pages/Lancamentos';
import ContasPagar      from './pages/ContasPagar';
import ContasReceber    from './pages/ContasReceber';
import FluxoCaixa       from './pages/FluxoCaixa';
import ProgramacaoSemana from './pages/ProgramacaoSemana';
import Relatorios       from './pages/Relatorios';

// Páginas de cadastro (FINANCEIRO ou ADMIN)
import Clientes    from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import PlanoContas from './pages/PlanoContas';
import Passivos    from './pages/Passivos';

// Páginas administrativas (somente ADMIN)
import GestaoAcessos from './pages/GestaoAcessos';
import AuditLog      from './pages/AuditLog';

/**
 * Guard que redireciona para /setup se o usuário não tiver empresa ativa.
 * Só age depois que o loading de empresas terminar para evitar flash.
 */
function EmpresaGuard({ children }) {
  const { empresaAtiva, empresas, loadingEmpresas } = useAuth();
  const location = useLocation();

  // Se está na página de setup, não faz nada
  if (location.pathname === '/setup') return children;

  // Aguarda carregar
  if (loadingEmpresas) return null;

  // Se não tem empresa ativa e já carregou a lista
  if (!empresaAtiva && empresas.length === 0) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: BRAND.teal, secondary: 'white' } },
          }}
        />

        <Routes>
          {/* Rotas públicas */}
          <Route path="/login"         element={<Login />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />

          {/* Setup de empresa — protegido (usuário logado), sem empresa obrigatória */}
          <Route path="/setup" element={
            <ProtectedRoute>
              <SetupEmpresa />
            </ProtectedRoute>
          } />

          {/* Rotas protegidas — envolvidas em Layout + guard de empresa */}
          <Route path="/*" element={
            <ProtectedRoute>
              <EmpresaGuard>
                <Layout>
                  <Routes>
                    {/* Qualquer usuário ativo */}
                    <Route path="/"                   element={<Dashboard />} />
                    <Route path="/lancamentos"        element={<Lancamentos />} />
                    <Route path="/contas-pagar"       element={<ContasPagar />} />
                    <Route path="/contas-receber"     element={<ContasReceber />} />
                    <Route path="/fluxo-caixa"        element={<FluxoCaixa />} />
                    <Route path="/programacao-semana" element={<ProgramacaoSemana />} />
                    <Route path="/relatorios"         element={<Relatorios />} />

                    {/* FINANCEIRO ou ADMIN */}
                    <Route path="/clientes"    element={<ProtectedRoute requiredRole="FINANCEIRO"><Clientes /></ProtectedRoute>} />
                    <Route path="/fornecedores"element={<ProtectedRoute requiredRole="FINANCEIRO"><Fornecedores /></ProtectedRoute>} />
                    <Route path="/plano-contas"element={<ProtectedRoute requiredRole="FINANCEIRO"><PlanoContas /></ProtectedRoute>} />
                    <Route path="/passivos"    element={<ProtectedRoute requiredRole="FINANCEIRO"><Passivos /></ProtectedRoute>} />

                    {/* Somente ADMIN */}
                    <Route path="/gestao-acessos" element={<ProtectedRoute requiredRole="ADMIN"><GestaoAcessos /></ProtectedRoute>} />
                    <Route path="/audit-log"      element={<ProtectedRoute requiredRole="ADMIN"><AuditLog /></ProtectedRoute>} />
                  </Routes>
                </Layout>
              </EmpresaGuard>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
