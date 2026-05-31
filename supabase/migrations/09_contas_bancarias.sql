-- Migration 09: Contas Bancárias
-- Cadastro de contas bancárias por empresa + vínculo com lançamentos

CREATE TABLE IF NOT EXISTS contas_bancarias (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome          VARCHAR(100) NOT NULL,
  banco         VARCHAR(100),
  banco_codigo  VARCHAR(10),
  agencia       VARCHAR(20),
  numero_conta  VARCHAR(30),
  tipo          VARCHAR(20) DEFAULT 'CORRENTE' CHECK (tipo IN ('CORRENTE','POUPANCA','CAIXA','INVESTIMENTO')),
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  ativo         BOOLEAN DEFAULT true,
  ofx_bank_id   VARCHAR(50),   -- BANKID do OFX para auto-match
  ofx_acct_id   VARCHAR(50),   -- ACCTID do OFX para auto-match
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contas_bancarias_empresa   ON contas_bancarias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ofx       ON contas_bancarias(ofx_bank_id, ofx_acct_id);

ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES contas_bancarias(id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_bancaria ON lancamentos(conta_bancaria_id);
