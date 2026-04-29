-- ============================================================
-- FluxD · Multi-tenant: tabelas de empresas
-- ============================================================

-- Tabela principal de empresas (tenants)
CREATE TABLE IF NOT EXISTS empresas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  cnpj        TEXT        UNIQUE,
  logo_url    TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vínculo N:N entre usuários e empresas (com perfil por empresa)
CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  empresa_id  UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  perfil      TEXT        NOT NULL DEFAULT 'VISUALIZACAO'
                          CHECK (perfil IN ('ADMIN','FINANCEIRO','VISUALIZACAO')),
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_user    ON usuarios_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);

-- ----------------------------------------------------------------
-- Adiciona empresa_id a todas as tabelas financeiras (nullable para
-- manter compatibilidade com dados pré-migração)
-- ----------------------------------------------------------------
ALTER TABLE lancamentos    ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE contas_pagar   ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE clientes       ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE fornecedores   ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
ALTER TABLE plano_contas   ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);

-- Índices para performance nas queries filtradas por empresa
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa    ON lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa   ON contas_pagar(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_empresa ON contas_receber(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa       ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa   ON fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plano_contas_empresa   ON plano_contas(empresa_id);

-- ----------------------------------------------------------------
-- RLS: ligar as políticas (service_role ignora RLS por padrão)
-- ----------------------------------------------------------------
ALTER TABLE empresas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
