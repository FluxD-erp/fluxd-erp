-- ============================================================
-- FluxD · Recorrências e Parcelamentos
-- ============================================================

-- Contas a Pagar
ALTER TABLE contas_pagar
  ADD COLUMN IF NOT EXISTS recorrente    BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frequencia    TEXT     CHECK (frequencia IN
    ('SEMANAL','QUINZENAL','MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  ADD COLUMN IF NOT EXISTS parcelado     BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS num_parcelas  INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_atual INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grupo_id      UUID;   -- liga parcelas/recorrências do mesmo grupo

-- Contas a Receber
ALTER TABLE contas_receber
  ADD COLUMN IF NOT EXISTS recorrente    BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS frequencia    TEXT     CHECK (frequencia IN
    ('SEMANAL','QUINZENAL','MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  ADD COLUMN IF NOT EXISTS parcelado     BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS num_parcelas  INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parcela_atual INTEGER  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grupo_id      UUID;

CREATE INDEX IF NOT EXISTS idx_cp_grupo  ON contas_pagar(grupo_id);
CREATE INDEX IF NOT EXISTS idx_cr_grupo  ON contas_receber(grupo_id);
