-- Migration 10: Credenciais API Banco Inter por conta bancária

ALTER TABLE contas_bancarias
  ADD COLUMN IF NOT EXISTS inter_client_id     TEXT,
  ADD COLUMN IF NOT EXISTS inter_client_secret TEXT,
  ADD COLUMN IF NOT EXISTS inter_cert_pem      TEXT,  -- certificado .crt em PEM (base64)
  ADD COLUMN IF NOT EXISTS inter_key_pem       TEXT;  -- chave privada .key em PEM (base64)
