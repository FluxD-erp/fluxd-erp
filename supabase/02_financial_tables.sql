-- FluxD · Tabelas financeiras no Supabase PostgreSQL
-- Execute no SQL Editor do Supabase após 00_profiles.sql e 01_audit_logs.sql

-- ----------------------------------------------------------------
-- CLIENTES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             TEXT        NOT NULL,
  nome             TEXT        NOT NULL,
  razao_social     TEXT,
  cpf_cnpj         TEXT        UNIQUE,
  email            TEXT,
  telefone         TEXT,
  endereco         TEXT,
  numero           TEXT,
  complemento      TEXT,
  bairro           TEXT,
  cidade           TEXT,
  uf               TEXT,
  cep              TEXT,
  situacao_cadastral   TEXT,
  atividade_principal  TEXT,
  ativo            BOOLEAN     DEFAULT true,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- FORNECEDORES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fornecedores (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             TEXT        NOT NULL,
  nome             TEXT        NOT NULL,
  razao_social     TEXT,
  cpf_cnpj         TEXT        UNIQUE,
  email            TEXT,
  telefone         TEXT,
  endereco         TEXT,
  numero           TEXT,
  complemento      TEXT,
  bairro           TEXT,
  cidade           TEXT,
  uf               TEXT,
  cep              TEXT,
  situacao_cadastral   TEXT,
  atividade_principal  TEXT,
  categoria        TEXT,
  ativo            BOOLEAN     DEFAULT true,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- PLANO DE CONTAS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plano_contas (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       TEXT    UNIQUE NOT NULL,
  nome         TEXT    NOT NULL,
  tipo         TEXT    NOT NULL,
  natureza     TEXT    NOT NULL,
  nivel        INTEGER DEFAULT 1,
  conta_pai_id UUID    REFERENCES plano_contas(id),
  ativo        BOOLEAN DEFAULT true
);

-- ----------------------------------------------------------------
-- LANÇAMENTOS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lancamentos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao         TEXT        NOT NULL,
  tipo              TEXT        NOT NULL,
  valor             NUMERIC(15,2) NOT NULL,
  data_competencia  DATE        NOT NULL,
  data_pagamento    DATE,
  status            TEXT        DEFAULT 'PENDENTE',
  conta_id          UUID        REFERENCES plano_contas(id),
  cliente_id        UUID        REFERENCES clientes(id),
  fornecedor_id     UUID        REFERENCES fornecedores(id),
  numero_documento  TEXT,
  observacao        TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lanc_tipo_status  ON lancamentos(tipo, status);
CREATE INDEX IF NOT EXISTS idx_lanc_data         ON lancamentos(data_competencia);

-- ----------------------------------------------------------------
-- CONTAS A PAGAR
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_pagar (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id     UUID          NOT NULL REFERENCES fornecedores(id),
  descricao         TEXT          NOT NULL,
  valor_original    NUMERIC(15,2) NOT NULL,
  valor_pago        NUMERIC(15,2) DEFAULT 0,
  data_emissao      DATE          NOT NULL,
  data_vencimento   DATE          NOT NULL,
  data_pagamento    DATE,
  status            TEXT          DEFAULT 'ABERTA',
  numero_documento  TEXT,
  conta_id          UUID          REFERENCES plano_contas(id),
  observacao        TEXT,
  criado_em         TIMESTAMPTZ   DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpagar_status     ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_cpagar_vencimento ON contas_pagar(data_vencimento);

-- ----------------------------------------------------------------
-- CONTAS A RECEBER
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_receber (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID          NOT NULL REFERENCES clientes(id),
  descricao         TEXT          NOT NULL,
  valor_original    NUMERIC(15,2) NOT NULL,
  valor_recebido    NUMERIC(15,2) DEFAULT 0,
  data_emissao      DATE          NOT NULL,
  data_vencimento   DATE          NOT NULL,
  data_recebimento  DATE,
  status            TEXT          DEFAULT 'ABERTA',
  numero_documento  TEXT,
  conta_id          UUID          REFERENCES plano_contas(id),
  observacao        TEXT,
  criado_em         TIMESTAMPTZ   DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creceber_status     ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_creceber_vencimento ON contas_receber(data_vencimento);

-- ----------------------------------------------------------------
-- RLS — acesso apenas via service_role (servidor)
-- Nenhuma política = frontend não acessa diretamente
-- ----------------------------------------------------------------
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber  ENABLE ROW LEVEL SECURITY;
