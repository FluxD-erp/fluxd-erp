/**
 * FluxD · Middleware de empresa (multi-tenant)
 *
 * Lê o header X-Empresa-ID e valida que o usuário autenticado
 * tem acesso àquela empresa. Requer que requireAuth já tenha
 * rodado antes (precisa de req.user).
 *
 * Uso:
 *   router.get('/rota', requireAuth, requireEmpresa, handler);
 */

const { db: supabaseAdmin } = require('../db/supabase');

async function requireEmpresa(req, res, next) {
  // Header é a fonte canônica. O body é aceito como fallback para rotas que
  // recebem empresa_id no payload (ex.: /billing/create-checkout) — a validação
  // de vínculo abaixo é a mesma nos dois casos.
  const empresaId = req.headers['x-empresa-id'] || req.body?.empresa_id;

  if (!empresaId) {
    return res.status(400).json({ error: 'Header X-Empresa-ID é obrigatório.' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  // 1) Verifica vínculo direto na tabela usuarios_empresas
  const { data: ue } = await supabaseAdmin
    .from('usuarios_empresas')
    .select('perfil, ativo')
    .eq('user_id', userId)
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .maybeSingle();

  if (ue) {
    req.empresaId     = empresaId;
    req.empresaPerfil = ue.perfil;
    return next();
  }

  // 2) Admin global pode acessar qualquer empresa sem vínculo explícito
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('perfil, ativo')
    .eq('id', userId)
    .single();

  if (profile?.perfil === 'ADMIN' && profile?.ativo) {
    req.empresaId     = empresaId;
    req.empresaPerfil = 'ADMIN';
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
}

module.exports = { requireEmpresa };
