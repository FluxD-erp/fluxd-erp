/**
 * FluxD · Audit Log Manual
 *
 * Use este helper nos componentes de formulário para registrar ações
 * que NÃO são cobertas por triggers PostgreSQL (ex: tabelas ainda em
 * SQLite local, ações de UI, exportações, logins, etc.).
 *
 * Exemplo de uso:
 *   import { logAction } from '../lib/auditLog';
 *
 *   // Após salvar uma conta a pagar:
 *   await logAction({
 *     tableName : 'contas_pagar',
 *     recordId  : novaConta.id,
 *     action    : 'INSERT',
 *     newValue  : novaConta,
 *   });
 *
 *   // Após editar um lançamento:
 *   await logAction({
 *     tableName : 'lancamentos',
 *     recordId  : id,
 *     action    : 'UPDATE',
 *     oldValue  : dadosAntes,
 *     newValue  : dadosDepois,
 *   });
 */

import { supabase } from './supabase';

/**
 * @param {{ tableName: string, recordId: string|number, action: 'INSERT'|'UPDATE'|'DELETE', oldValue?: object, newValue?: object }} params
 */
export async function logAction({ tableName, recordId, action, oldValue, newValue }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('audit_logs').insert({
      user_id    : user?.id    ?? null,
      user_email : user?.email ?? null,
      table_name : tableName,
      record_id  : String(recordId),
      action,
      old_value  : oldValue  ? oldValue  : null,
      new_value  : newValue  ? newValue  : null,
    });

    if (error) {
      console.warn('[auditLog] Falha ao registrar log:', error.message);
    }
  } catch (e) {
    // Log nunca deve quebrar o fluxo principal
    console.warn('[auditLog] Erro inesperado:', e);
  }
}
