-- Migration 08: Row Level Security (RLS) — isolamento multi-tenant
-- Cole no SQL Editor do Supabase e execute.
-- Dependencias: tabela empresa_usuarios (empresa_id, user_id, perfil, ativo)

-- Helper: IDs de empresa que o usuario autenticado tem acesso ativo
CREATE OR REPLACE FUNCTION auth.empresas_do_usuario()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM empresa_usuarios
  WHERE user_id = auth.uid() AND ativo = true;
$$;

-- EMPRESAS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_select" ON empresas;
CREATE POLICY "empresas_select" ON empresas
  FOR SELECT USING (id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "empresas_update" ON empresas;
CREATE POLICY "empresas_update" ON empresas
  FOR UPDATE USING (id IN (
    SELECT empresa_id FROM empresa_usuarios
    WHERE user_id = auth.uid() AND perfil = 'ADMIN' AND ativo = true
  ));

-- EMPRESA_USUARIOS
ALTER TABLE empresa_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eu_select" ON empresa_usuarios;
CREATE POLICY "eu_select" ON empresa_usuarios
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "eu_insert" ON empresa_usuarios;
CREATE POLICY "eu_insert" ON empresa_usuarios
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM empresa_usuarios
    WHERE user_id = auth.uid() AND perfil = 'ADMIN' AND ativo = true
  ));
DROP POLICY IF EXISTS "eu_update" ON empresa_usuarios;
CREATE POLICY "eu_update" ON empresa_usuarios
  FOR UPDATE USING (empresa_id IN (
    SELECT empresa_id FROM empresa_usuarios
    WHERE user_id = auth.uid() AND perfil = 'ADMIN' AND ativo = true
  ));

-- LANCAMENTOS
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lanc_select" ON lancamentos;
CREATE POLICY "lanc_select" ON lancamentos
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "lanc_insert" ON lancamentos;
CREATE POLICY "lanc_insert" ON lancamentos
  FOR INSERT WITH CHECK (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "lanc_update" ON lancamentos;
CREATE POLICY "lanc_update" ON lancamentos
  FOR UPDATE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "lanc_delete" ON lancamentos;
CREATE POLICY "lanc_delete" ON lancamentos
  FOR DELETE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));

-- CONTAS_PAGAR
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_select" ON contas_pagar;
CREATE POLICY "cp_select" ON contas_pagar
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cp_insert" ON contas_pagar;
CREATE POLICY "cp_insert" ON contas_pagar
  FOR INSERT WITH CHECK (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cp_update" ON contas_pagar;
CREATE POLICY "cp_update" ON contas_pagar
  FOR UPDATE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cp_delete" ON contas_pagar;
CREATE POLICY "cp_delete" ON contas_pagar
  FOR DELETE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));

-- CONTAS_RECEBER
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cr_select" ON contas_receber;
CREATE POLICY "cr_select" ON contas_receber
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cr_insert" ON contas_receber;
CREATE POLICY "cr_insert" ON contas_receber
  FOR INSERT WITH CHECK (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cr_update" ON contas_receber;
CREATE POLICY "cr_update" ON contas_receber
  FOR UPDATE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cr_delete" ON contas_receber;
CREATE POLICY "cr_delete" ON contas_receber
  FOR DELETE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));

-- CLIENTES
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cli_select" ON clientes;
CREATE POLICY "cli_select" ON clientes
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cli_insert" ON clientes;
CREATE POLICY "cli_insert" ON clientes
  FOR INSERT WITH CHECK (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cli_update" ON clientes;
CREATE POLICY "cli_update" ON clientes
  FOR UPDATE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "cli_delete" ON clientes;
CREATE POLICY "cli_delete" ON clientes
  FOR DELETE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));

-- FORNECEDORES
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forn_select" ON fornecedores;
CREATE POLICY "forn_select" ON fornecedores
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "forn_insert" ON fornecedores;
CREATE POLICY "forn_insert" ON fornecedores
  FOR INSERT WITH CHECK (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "forn_update" ON fornecedores;
CREATE POLICY "forn_update" ON fornecedores
  FOR UPDATE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "forn_delete" ON fornecedores;
CREATE POLICY "forn_delete" ON fornecedores
  FOR DELETE USING (empresa_id IN (SELECT auth.empresas_do_usuario()));

-- PLANO_CONTAS — leitura por empresa, escrita so ADMIN
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pc_select" ON plano_contas;
CREATE POLICY "pc_select" ON plano_contas
  FOR SELECT USING (empresa_id IN (SELECT auth.empresas_do_usuario()));
DROP POLICY IF EXISTS "pc_write" ON plano_contas;
CREATE POLICY "pc_write" ON plano_contas
  FOR ALL USING (empresa_id IN (
    SELECT empresa_id FROM empresa_usuarios
    WHERE user_id = auth.uid() AND perfil = 'ADMIN' AND ativo = true
  ));

-- PROFILES — cada usuario ve/edita apenas o proprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prof_select_own" ON profiles;
CREATE POLICY "prof_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "prof_update_own" ON profiles;
CREATE POLICY "prof_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- NOTA: audit_logs nao tem RLS aqui pois e acessado via service_role no backend.
-- Se quiser restringir leitura direta, adicione empresa_id na tabela e crie policy similar.
