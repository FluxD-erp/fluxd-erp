-- Migration 11: Recebíveis de Cartão + Antecipações

-- ── Recebíveis individuais ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recebiveis_cartao (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  operadora       VARCHAR(50) DEFAULT 'REDE',
  bandeira        VARCHAR(30),              -- VISA, MASTER, ELO, etc.
  nsu             VARCHAR(50),              -- nº único da transação
  terminal        VARCHAR(50),
  data_venda      DATE        NOT NULL,
  data_prevista   DATE        NOT NULL,
  descricao       TEXT,
  valor_bruto     NUMERIC(15,2) NOT NULL,
  taxa_mdr        NUMERIC(6,4)  DEFAULT 0,  -- ex: 0.0299 = 2,99%
  valor_liquido   NUMERIC(15,2) NOT NULL,
  parcela_atual   INTEGER       DEFAULT 1,
  num_parcelas    INTEGER       DEFAULT 1,
  status          VARCHAR(20)   DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE','RECEBIDO','ANTECIPADO','CANCELADO')),
  grupo_venda_id  UUID,                     -- agrupa parcelas da mesma venda
  antecipacao_id  UUID,                     -- preenchido ao antecipar
  cliente_id      UUID REFERENCES clientes(id),
  lancamento_id   UUID,                     -- lançamento gerado ao confirmar recebimento
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Registros de antecipação ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS antecipacoes_cartao (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id          UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  operadora           VARCHAR(50) DEFAULT 'REDE',
  data_solicitacao    DATE        NOT NULL,
  data_credito        DATE,
  qtd_recebiveis      INTEGER     NOT NULL,
  valor_bruto         NUMERIC(15,2) NOT NULL,
  taxa_antecipacao    NUMERIC(6,4)  NOT NULL, -- ex: 0.025 = 2,5% ao mês
  dias_antecipados    INTEGER,
  valor_desconto      NUMERIC(15,2) NOT NULL,
  valor_liquido       NUMERIC(15,2) NOT NULL,
  status              VARCHAR(20)   DEFAULT 'CONFIRMADA'
                      CHECK (status IN ('PENDENTE','CONFIRMADA','CANCELADA')),
  observacao          TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recebiveis_empresa    ON recebiveis_cartao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recebiveis_status     ON recebiveis_cartao(status);
CREATE INDEX IF NOT EXISTS idx_recebiveis_prevista   ON recebiveis_cartao(data_prevista);
CREATE INDEX IF NOT EXISTS idx_antecipacoes_empresa  ON antecipacoes_cartao(empresa_id);

-- FK antecipação
ALTER TABLE recebiveis_cartao
  ADD CONSTRAINT fk_recebiveis_antecipacao
  FOREIGN KEY (antecipacao_id) REFERENCES antecipacoes_cartao(id);
