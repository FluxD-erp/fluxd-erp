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
// GET /api/admin/users — lista todos os profiles
// ----------------------------------------------------------------
router.get('/users', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ----------------------------------------------------------------
// POST /api/admin/invite-user — cria usuário e envia e-mail de convite
// Body: { email, nome, perfil }
// ----------------------------------------------------------------
router.post('/invite-user', async (req, res) => {
  const { email, nome, perfil = 'VISUALIZACAO' } = req.body;

  if (!email || !nome) {
    return res.status(400).json({ error: 'email e nome são obrigatórios.' });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  // Cria o usuário no Supabase Auth (envia e-mail de convite)
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data       : { nome, perfil }, // raw_user_meta_data → lido pelo trigger handle_new_user()
    redirectTo : `${appUrl}/definir-senha`,
  });

  if (error) {
    // Se o usuário já existe, apenas atualiza o profile
    if (error.message.includes('already been registered')) {
      return res.status(409).json({ error: 'E-mail já cadastrado no sistema.' });
    }
    return res.status(500).json({ error: error.message });
  }

  // Garante que o profile existe com o perfil correto
  // (o trigger handle_new_user faz isso automaticamente, mas garantimos aqui)
  await supabaseAdmin.from('profiles').upsert({
    id    : data.user.id,
    nome,
    email,
    perfil,
    ativo : true,
  }, { onConflict: 'id' });

  res.status(201).json({
    success : true,
    userId  : data.user.id,
    message : `Convite enviado para ${email}`,
  });
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
