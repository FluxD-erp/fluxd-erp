/**
 * FluxD · Middleware de autenticação via Supabase JWT
 *
 * Uso nas rotas Express:
 *   router.post('/lancamentos', requireAuth, requireRole('FINANCEIRO'), handler);
 */

const { db: supabaseAdmin } = require('../db/supabase');

/**
 * Valida o JWT do Supabase e coloca req.user com os dados do usuário.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso não fornecido.' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  req.user = user;
  next();
}

/**
 * Verifica se o usuário tem o perfil mínimo necessário.
 * Hierarquia: ADMIN > FINANCEIRO > VISUALIZACAO
 *
 * @param {'ADMIN'|'FINANCEIRO'|'VISUALIZACAO'} minRole
 */
function requireRole(minRole) {
  const HIERARCHY = { VISUALIZACAO: 0, FINANCEIRO: 1, ADMIN: 2 };

  return async (req, res, next) => {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('perfil, ativo')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Perfil não encontrado.' });
    }
    if (!profile.ativo) {
      return res.status(403).json({ error: 'Conta desativada.' });
    }

    const userLevel    = HIERARCHY[profile.perfil]  ?? -1;
    const neededLevel  = HIERARCHY[minRole]          ?? 99;

    if (userLevel < neededLevel) {
      return res.status(403).json({
        error: `Permissão insuficiente. Requer perfil: ${minRole}.`,
      });
    }

    req.profile = profile;
    next();
  };
}

module.exports = { requireAuth, requireRole, supabaseAdmin };
