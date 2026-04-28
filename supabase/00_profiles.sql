-- ================================================================
-- FluxD · Tabela de Perfis e RBAC
-- Execute no Supabase → SQL Editor (em ordem: 00 antes do 01)
-- ================================================================

-- Enum: perfis disponíveis no sistema (idempotente)
DO $$ BEGIN
  CREATE TYPE perfil_tipo AS ENUM ('ADMIN', 'FINANCEIRO', 'VISUALIZACAO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela profiles (espelha auth.users com metadados de permissão)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  perfil          perfil_tipo NOT NULL DEFAULT 'VISUALIZACAO',
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_email_idx  ON profiles(email);
CREATE INDEX profiles_perfil_idx ON profiles(perfil);
CREATE INDEX profiles_ativo_idx  ON profiles(ativo);

-- Atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- Função auxiliar: retorna o perfil do usuário atual (usado em RLS)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_perfil()
RETURNS perfil_tipo AS $$
  SELECT perfil FROM profiles
  WHERE id = auth.uid() AND ativo = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado vê o próprio registro
CREATE POLICY "ver_proprio_perfil"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admin vê todos
CREATE POLICY "admin_ver_todos"
  ON profiles FOR SELECT
  USING (get_my_perfil() = 'ADMIN');

-- Admin pode criar/atualizar qualquer perfil
CREATE POLICY "admin_gerenciar_perfis"
  ON profiles FOR ALL
  USING (get_my_perfil() = 'ADMIN');

-- ----------------------------------------------------------------
-- Trigger: cria profile automaticamente ao criar usuário no Auth
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'perfil')::perfil_tipo,
      'VISUALIZACAO'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------
-- Após rodar este script, promova o primeiro admin manualmente:
-- UPDATE profiles SET perfil = 'ADMIN' WHERE email = 'seu@email.com';
-- ----------------------------------------------------------------
