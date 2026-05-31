-- Google Calendar integration
-- Tokens OAuth por usuário
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry  TIMESTAMPTZ NOT NULL,
  calendar_id   TEXT NOT NULL DEFAULT 'primary',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Mapeamento evento ↔ conta_pagar por usuário
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id   UUID NOT NULL,
  event_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, conta_id)
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS; frontend não acessa essas tabelas diretamente
CREATE POLICY "service role only tokens" ON google_calendar_tokens
  USING (false);
CREATE POLICY "service role only events" ON google_calendar_events
  USING (false);
