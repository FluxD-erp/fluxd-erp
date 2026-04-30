-- ============================================================
-- FluxD · Billing (Stripe)
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS plano               TEXT    DEFAULT 'FREE'
    CHECK (plano IN ('FREE','PRO','ENTERPRISE')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id  TEXT,
  ADD COLUMN IF NOT EXISTS plano_expira_em     TIMESTAMPTZ;
