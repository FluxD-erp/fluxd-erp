/**
 * FluxD · Audit Logger server-side
 *
 * Insere logs diretamente no Supabase usando a service_role key.
 * Use nas rotas Express que operam sobre tabelas ainda em SQLite local
 * (antes de migrar para Supabase).
 *
 * Exemplo de uso na rota:
 *   const { serverLog } = require('../lib/serverAuditLogger');
 *
 *   router.post('/lancamentos', requireAuth, async (req, res) => {
 *     // ... salva no SQLite ...
 *     await serverLog(req, {
 *       tableName : 'lancamentos',
 *       recordId  : novoId,
 *       action    : 'INSERT',
 *       newValue  : req.body,
 *     });
 *     res.status(201).json({ id: novoId });
 *   });
 */

const { supabaseAdmin } = require('../middleware/auth');

/**
 * @param {import('express').Request} req  — para extrair user_id / user_email
 * @param {{ tableName: string, recordId: string, action: 'INSERT'|'UPDATE'|'DELETE', oldValue?: object, newValue?: object }} opts
 */
async function serverLog(req, { tableName, recordId, action, oldValue, newValue }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id    : req.user?.id    ?? null,
      user_email : req.user?.email ?? null,
      table_name : tableName,
      record_id  : String(recordId),
      action,
      old_value  : oldValue  ?? null,
      new_value  : newValue  ?? null,
    });
  } catch (e) {
    // Log nunca deve quebrar o fluxo principal
    console.warn('[serverLog] Falha ao gravar audit log:', e.message);
  }
}

module.exports = { serverLog };
