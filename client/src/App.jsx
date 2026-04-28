import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BRAND } from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Páginas públicas
import Login from './pages/Login';
import DefinirSenha from './pages/DefinirSenha';

// Páginas financeiras (qualquer usuário ativo)
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import FluxoCaixa from './pages/FluxoCaixa';
import ProgramacaoSemana from './pages/ProgramacaoSemana';
import Relatorios from './pages/Relatorios';

// Páginas de cadastro (FINANCEIRO ou ADMIN)
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import PlanoContas from './pages/PlanoContas';
import Passivos from './pages/Passivos';

// Páginas administrativas (somente ADMIN)
import GestaoAcessos from './pages/GestaoAcessos';
import AuditLog from './pages/AuditLog';

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

          {/* Rotas protegidas — envolvidas em Layout */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* Qualquer usuário ativo */}
                  <Route path="/"                    element={<Dashboard />} />
                  <Route path="/lancamentos"         element={<Lancamentos />} />
                  <Route path="/contas-pagar"        element={<ContasPagar />} />
                  <Route path="/contas-receber"      element={<ContasReceber />} />
                  <Route path="/fluxo-caixa"         element={<FluxoCaixa />} />
                  <Route path="/programacao-semana"  element={<ProgramacaoSemana />} />
                  <Route path="/relatorios"          element={<Relatorios />} />

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
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
