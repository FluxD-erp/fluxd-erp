/**
 * FluxD · Google Calendar API helper
 * Cria/atualiza/remove eventos de Contas a Pagar nas agendas dos usuários.
 */

const { db } = require('../db/supabase');

const TOKEN_URL    = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function dateNext(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function buildEvent(conta) {
  return {
    summary: `[PAGAR] ${conta.descricao} — ${fmt(conta.valor_original)}`,
    description: [
      'Conta a Pagar — FluxD ERP',
      `Valor: ${fmt(conta.valor_original)}`,
      `Status: ${conta.status || 'PENDENTE'}`,
      conta.numero_documento ? `Documento: ${conta.numero_documento}` : '',
      conta.observacao       ? `Obs: ${conta.observacao}` : '',
    ].filter(Boolean).join('\n'),
    start  : { date: conta.data_vencimento },
    end    : { date: dateNext(conta.data_vencimento) },
    colorId: '11', // vermelho
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 480  }, // 8h antes
        { method: 'email', minutes: 1440 }, // 1 dia antes
      ],
    },
  };
}

async function getAccessToken(tok) {
  if (new Date(tok.token_expiry) > new Date(Date.now() + 60_000)) return tok.access_token;

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id    : process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tok.refresh_token,
      grant_type   : 'refresh_token',
    }),
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error('Falha ao renovar token Google');

  const expiry = new Date(Date.now() + json.expires_in * 1000).toISOString();
  await db.from('google_calendar_tokens')
    .update({ access_token: json.access_token, token_expiry: expiry, updated_at: new Date().toISOString() })
    .eq('user_id', tok.user_id);

  return json.access_token;
}

async function calendarReq(accessToken, calendarId, method, path, body = null) {
  const url  = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}${path}`;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  if (resp.status === 204 || resp.status === 410) return null; // no content / gone
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function getConnectedUsers(empresaId) {
  const { data: members } = await db
    .from('usuarios_empresas')
    .select('user_id')
    .eq('empresa_id', empresaId)
    .eq('ativo', true);
  if (!members?.length) return [];

  const { data: tokens } = await db
    .from('google_calendar_tokens')
    .select('*')
    .in('user_id', members.map(m => m.user_id));

  return tokens || [];
}

async function createEvent(empresaId, contaId, conta) {
  const userTokens = await getConnectedUsers(empresaId);
  if (!userTokens.length) return;

  const event = buildEvent(conta);
  for (const tok of userTokens) {
    try {
      const token   = await getAccessToken(tok);
      const created = await calendarReq(token, tok.calendar_id, 'POST', '/events', event);
      if (created?.id) {
        await db.from('google_calendar_events')
          .upsert({ user_id: tok.user_id, conta_id: contaId, event_id: created.id });
      }
    } catch (e) {
      console.error(`[GCal] createEvent user=${tok.user_id}:`, e.message);
    }
  }
}

async function updateEvent(empresaId, contaId, conta) {
  const userTokens = await getConnectedUsers(empresaId);
  if (!userTokens.length) return;

  const { data: existing } = await db
    .from('google_calendar_events')
    .select('user_id, event_id')
    .eq('conta_id', contaId);

  const eventMap = Object.fromEntries((existing || []).map(e => [e.user_id, e.event_id]));
  const event    = buildEvent(conta);

  for (const tok of userTokens) {
    try {
      const token   = await getAccessToken(tok);
      const eventId = eventMap[tok.user_id];
      if (eventId) {
        await calendarReq(token, tok.calendar_id, 'PUT', `/events/${eventId}`, event);
      } else {
        const created = await calendarReq(token, tok.calendar_id, 'POST', '/events', event);
        if (created?.id) {
          await db.from('google_calendar_events')
            .upsert({ user_id: tok.user_id, conta_id: contaId, event_id: created.id });
        }
      }
    } catch (e) {
      console.error(`[GCal] updateEvent user=${tok.user_id}:`, e.message);
    }
  }
}

async function deleteEvent(empresaId, contaId) {
  const userTokens = await getConnectedUsers(empresaId);

  const { data: existing } = await db
    .from('google_calendar_events')
    .select('user_id, event_id')
    .eq('conta_id', contaId);

  const eventMap = Object.fromEntries((existing || []).map(e => [e.user_id, e.event_id]));

  for (const tok of userTokens) {
    const eventId = eventMap[tok.user_id];
    if (!eventId) continue;
    try {
      const token = await getAccessToken(tok);
      await calendarReq(token, tok.calendar_id, 'DELETE', `/events/${eventId}`);
    } catch (e) {
      console.error(`[GCal] deleteEvent user=${tok.user_id}:`, e.message);
    }
  }

  await db.from('google_calendar_events').delete().eq('conta_id', contaId);
}

module.exports = { createEvent, updateEvent, deleteEvent };
