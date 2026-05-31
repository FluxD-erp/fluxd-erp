/**
 * FluxD · Google Calendar OAuth
 * Prefixo: /api/auth/google
 */

const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// GET /api/auth/google/connect — retorna URL de autorização Google
router.get('/connect', requireAuth, (req, res) => {
  const params = new URLSearchParams({
    client_id    : process.env.GOOGLE_CLIENT_ID,
    redirect_uri : `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope        : SCOPES,
    access_type  : 'offline',
    prompt       : 'consent',
    state        : req.user.id,
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

// GET /api/auth/google/callback — troca code por tokens e salva no Supabase
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;
  const redirectBase = `${process.env.APP_URL}/configuracoes?section=integracoes`;

  if (error || !code || !userId) {
    return res.redirect(`${redirectBase}&gcal=error`);
  }

  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id    : process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri : `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type   : 'authorization_code',
      }),
    });
    const tokens = await resp.json();
    if (!tokens.access_token) throw new Error('Token não recebido');

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const { error: dbErr } = await db.from('google_calendar_tokens').upsert({
      user_id      : userId,
      access_token : tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry : expiry,
      calendar_id  : 'primary',
      updated_at   : new Date().toISOString(),
    });
    if (dbErr) throw dbErr;

    res.redirect(`${redirectBase}&gcal=success`);
  } catch (e) {
    console.error('[GCal] callback error:', e.message);
    res.redirect(`${redirectBase}&gcal=error`);
  }
});

// GET /api/auth/google/status — verifica conexão do usuário atual
router.get('/status', requireAuth, async (req, res) => {
  const { data } = await db
    .from('google_calendar_tokens')
    .select('calendar_id, updated_at')
    .eq('user_id', req.user.id)
    .maybeSingle();
  res.json({ connected: !!data, ...(data || {}) });
});

// DELETE /api/auth/google/disconnect — revoga e remove tokens
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const { data: tok } = await db
      .from('google_calendar_tokens')
      .select('access_token')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (tok?.access_token) {
      // Tenta revogar no Google (best-effort, ignora falha)
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tok.access_token}`, { method: 'POST' })
        .catch(() => {});
    }

    await db.from('google_calendar_tokens').delete().eq('user_id', req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
