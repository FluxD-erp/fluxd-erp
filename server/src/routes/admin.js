/**
 * FluxD · Rotas administrativas (requerem ADMIN)
 * Prefixo: /api/admin
 */

const express = require('express');
const router  = express.Router();
const { requireAuth, requireRole, supabaseAdmin } = require('../middleware/auth');

// Todas as rotas deste arquivo requerem auth + perfil ADMIN
router.use(requireAuth, requireRole('ADMIN'));

// ----------------------------------------------------------------
// GET /api/admin/users — lista profiles enriquecidos com status de confirmação
// ----------------------------------------------------------------
router.get('/users', async (req, res) => {
  const [profilesResult, authResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').order('criado_em', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (profilesResult.error) return res.status(500).json({ error: profilesResult.error.message });

  // Mapeia confirmação por ID
  const authMap = {};
  (authResult.data?.users || []).forEach(u => {
    authMap[u.id] = !!u.email_confirmed_at;
  });

  const data = (profilesResult.data || []).map(p => ({
    ...p,
    confirmado: authMap[p.id] ?? false,
  }));

  res.json(data);
});

// ----------------------------------------------------------------
// POST /api/admin/invite-user — convida novo usuário OU vincula existente
// Body: { email, nome, perfil }
// Header: X-Empresa-ID (usado para vincular à empresa ativa)
// ----------------------------------------------------------------
router.post('/invite-user', async (req, res) => {
  const { email, nome, perfil = 'VISUALIZACAO', empresa_id } = req.body;
  const empresaId = req.headers['x-empresa-id'] || empresa_id;

  if (!email || !nome) {
    return res.status(400).json({ error: 'email e nome são obrigatórios.' });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  let userId;
  let jaExistia = false;

  // Tenta criar via convite (novo usuário)
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data       : { nome, perfil },
    redirectTo : `${appUrl}/definir-senha`,
  });

  if (error) {
    if (!error.message.includes('already been registered')) {
      return res.status(500).json({ error: error.message });
    }

    // Usuário já existe — busca o ID pelo e-mail
    jaExistia = true;
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) return res.status(500).json({ error: listErr.message });

    const existente = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!existente) return res.status(500).json({ error: 'Usuário não encontrado após busca.' });
    userId = existente.id;
  } else {
    userId = data.user.id;
  }

  // Garante que o profile existe com o perfil correto
  await supabaseAdmin.from('profiles').upsert({
    id    : userId,
    nome,
    email,
    perfil,
    ativo : true,
  }, { onConflict: 'id' });

  // Vincula à empresa ativa (se informada)
  if (empresaId) {
    // O caller precisa ter acesso à empresa que está sendo vinculada — um ADMIN
    // global não deve poder convidar usuários para tenants que não administra.
    const { data: ue } = await supabaseAdmin
      .from('usuarios_empresas')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .maybeSingle();

    if (!ue) {
      return res.status(403).json({ error: 'Acesso negado a esta empresa.' });
    }

    const { error: ueErr } = await supabaseAdmin.from('usuarios_empresas').upsert({
      user_id    : userId,
      empresa_id : empresaId,
      perfil,
      ativo      : true,
    }, { onConflict: 'user_id,empresa_id', ignoreDuplicates: false });

    if (ueErr) return res.status(500).json({ error: ueErr.message });
  }

  res.status(201).json({
    success  : true,
    userId,
    jaExistia,
    message  : jaExistia
      ? `${email} já estava cadastrado e foi vinculado à empresa com sucesso!`
      : `Convite enviado para ${email}`,
  });
});

// ----------------------------------------------------------------
// POST /api/admin/resend-invite — reenvia e-mail de convite
// Body: { email }
// ----------------------------------------------------------------
router.post('/resend-invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/definir-senha`,
  });

  // "already been registered" significa que o usuário já confirmou — não é erro aqui
  if (error && !error.message.includes('already been registered')) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, message: `Convite reenviado para ${email}` });
});

// ----------------------------------------------------------------
// PATCH /api/admin/users/:id — altera perfil ou status ativo
// Body: { perfil?, ativo? }
// ----------------------------------------------------------------
router.patch('/users/:id', async (req, res) => {
  const { perfil, ativo } = req.body;
  const updates = {};

  if (perfil !== undefined) updates.perfil = perfil;
  if (ativo  !== undefined) updates.ativo  = ativo;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
