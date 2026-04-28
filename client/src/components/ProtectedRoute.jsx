import { Navigate, useLocation } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Protege rotas por autenticação e perfil.
 *
 * Props:
 *  - requiredRole: 'ADMIN' | 'FINANCEIRO' | undefined
 *    - undefined → qualquer usuário ativo
 *    - 'FINANCEIRO' → FINANCEIRO ou ADMIN
 *    - 'ADMIN' → apenas ADMIN
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, isAdmin, isFinanceiro } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-unicri-orange rounded-xl flex items-center justify-center animate-pulse">
            <TrendingUp size={20} className="text-white" />
          </div>
          <p className="text-sm text-gray-400">Carregando…</p>
        </div>
      </div>
    );
  }

  // Não autenticado → Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário desativado
  if (profile && !profile.ativo) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-700">Acesso suspenso</p>
          <p className="text-sm text-gray-400 mt-1">Entre em contato com o administrador do sistema.</p>
        </div>
      </div>
    );
  }

  // Verificação de role
  if (requiredRole === 'ADMIN' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === 'FINANCEIRO' && !isFinanceiro) {
    return <Navigate to="/" replace />;
  }

  return children;
}
