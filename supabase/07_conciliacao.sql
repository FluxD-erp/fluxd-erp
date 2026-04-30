-- ============================================================
-- FluxD · Conciliação Bancária
-- ============================================================

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS conciliado    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ofx_fitid     TEXT,       -- ID único da transação no OFX
  ADD COLUMN IF NOT EXISTS ofx_memo      TEXT;       -- descrição original do banco

CREATE INDEX IF NOT EXISTS idx_lanc_conciliado ON lancamentos(conciliado);
CREATE INDEX IF NOT EXISTS idx_lanc_fitid      ON lancamentos(ofx_fitid);
