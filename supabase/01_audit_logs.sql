-- ================================================================
-- FluxD · Sistema de Audit Log
-- Execute APÓS o 00_profiles.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  table_name  TEXT        NOT NULL,
  record_id   TEXT        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_value   JSONB,
  new_value   JSONB,       -- no UPDATE: contém APENAS as colunas que mudaram
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para as queries do painel de auditoria
CREATE INDEX al_user_idx    ON audit_logs(user_id);
CREATE INDEX al_table_idx   ON audit_logs(table_name);
CREATE INDEX al_action_idx  ON audit_logs(action);
CREATE INDEX al_date_idx    ON audit_logs(created_at DESC);
CREATE INDEX al_record_idx  ON audit_logs(table_name, record_id);

-- ----------------------------------------------------------------
-- RLS: só ADMIN lê; ninguém insere diretamente (apenas via trigger)
-- ----------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_le_audit"
  ON audit_logs FOR SELECT
  USING (get_my_perfil() = 'ADMIN');

-- INSERT bloqueado para roles públicos — apenas a função SECURITY DEFINER grava
CREATE POLICY "sem_insert_direto"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- ----------------------------------------------------------------
-- Função genérica de auditoria (chamada por todos os triggers)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id    UUID;
  v_user_email TEXT;
  v_record_id  TEXT;
  v_old        JSONB;
  v_new        JSONB;
BEGIN
  -- Obtém usuário Supabase do contexto (pode ser NULL em migrações)
  BEGIN
    v_user_id    := auth.uid();
    v_user_email := auth.email();
  EXCEPTION WHEN OTHERS THEN
    v_user_id    := NULL;
    v_user_email := session_user;
  END;

  CASE TG_OP
    WHEN 'INSERT' THEN
      v_record_id := NEW.id::TEXT;
      v_old       := NULL;
      v_new       := to_jsonb(NEW);

    WHEN 'UPDATE' THEN
      v_record_id := NEW.id::TEXT;
      v_old       := to_jsonb(OLD);
      -- Armazena apenas as colunas que de fato mudaram (diff eficiente)
      SELECT jsonb_object_agg(key, value)
      INTO   v_new
      FROM   jsonb_each(to_jsonb(NEW))
      WHERE  (to_jsonb(OLD) -> key) IS DISTINCT FROM value;

    WHEN 'DELETE' THEN
      v_record_id := OLD.id::TEXT;
      v_old       := to_jsonb(OLD);
      v_new       := NULL;
  END CASE;

  INSERT INTO public.audit_logs
    (user_id, user_email, table_name, record_id, action, old_value, new_value)
  VALUES
    (v_user_id, v_user_email, TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- Função utilitária: ativa auditoria em qualquer tabela com 1 linha
-- Uso: SELECT enable_audit('nome_da_tabela');
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION enable_audit(p_table TEXT)
RETURNS TEXT AS $$
BEGIN
  EXECUTE format(
    'CREATE OR REPLACE TRIGGER %I
     AFTER INSERT OR UPDATE OR DELETE ON public.%I
     FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()',
    p_table || '_audit_trigger',
    p_table
  );
  RETURN 'Auditoria ativada em: ' || p_table;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- Ativar auditoria nas tabelas financeiras do FluxD
-- Descomente após migrar as tabelas para o Supabase, ou execute
-- individualmente conforme for migrando cada módulo.
-- ----------------------------------------------------------------
-- SELECT enable_audit('lancamentos');
-- SELECT enable_audit('contas_pagar');
-- SELECT enable_audit('contas_receber');
-- SELECT enable_audit('clientes');
-- SELECT enable_audit('fornecedores');
-- SELECT enable_audit('profiles');  -- audita mudanças de perfil/role
