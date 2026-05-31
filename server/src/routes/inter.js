/**
 * FluxD · Integração API Banco Inter
 * Documentação: https://developers.inter.co
 *
 * Autenticação: OAuth2 client_credentials + mTLS (certificado + chave privada)
 * Escopo: extrato.read
 */

const express = require('express');
const router  = express.Router();
const https   = require('https');
const fetch   = require('node-fetch');
const { db }  = require('../db/supabase');
const { encrypt, decrypt } = require('../lib/crypto');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');

router.use(requireAuth, requireEmpresa);

const INTER_BASE  = 'https://cdpj.partners.bancointer.com.br';
const TOKEN_URL   = `${INTER_BASE}/oauth/v2/token`;
const EXTRATO_URL = `${INTER_BASE}/banking/v2/extrato`;

// ── Helpers ──────────────────────────────────────────────────────

/** Cria um agente HTTPS com mTLS usando cert + key PEM */
function criarAgente(certPem, keyPem) {
  return new https.Agent({ cert: certPem, key: keyPem, rejectUnauthorized: true });
}

/** Obtém access_token do Inter via OAuth2 client_credentials */
async function obterToken(clientId, clientSecret, certPem, keyPem) {
  const agent = criarAgente(certPem, keyPem);
  const res   = await fetch(TOKEN_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body   : new URLSearchParams({
      client_id    : clientId,
      client_secret: clientSecret,
      scope        : 'extrato.read',
      grant_type   : 'client_credentials',
    }),
    agent,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Inter auth falhou (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/** Busca extrato do Inter para o período informado */
async function buscarExtrato(token, certPem, keyPem, dataInicio, dataFim) {
  const agent  = criarAgente(certPem, keyPem);
  const params = new URLSearchParams({ dataInicio, dataFim });
  const res    = await fetch(`${EXTRATO_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'x-conta-corrente': '' },
    agent,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Inter extrato falhou (${res.status}): ${err}`);
  }

  return res.json();
}

// ── POST /api/inter/credenciais/:contaId ─────────────────────────
// Salva credenciais Inter criptografadas na conta bancária
router.post('/credenciais/:contaId', async (req, res) => {
  try {
    const { inter_client_id, inter_client_secret, inter_cert_pem, inter_key_pem } = req.body;
    if (!inter_client_id || !inter_client_secret || !inter_cert_pem || !inter_key_pem)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });

    const { data, error } = await db
      .from('contas_bancarias')
      .update({
        inter_client_id,                          // client_id não é secret, não precisa criptografar
        inter_client_secret: encrypt(inter_client_secret),
        inter_cert_pem     : encrypt(inter_cert_pem),
        inter_key_pem      : encrypt(inter_key_pem),
      })
      .eq('id', req.params.contaId)
      .eq('empresa_id', req.empresaId)
      .select('id, nome')
      .single();

    if (error) throw error;
    res.json({ ok: true, conta: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/inter/extrato/:contaId ─────────────────────────────
// Busca o extrato do Inter para o período e retorna transações no
// mesmo formato do parseOfx (compatível com a Conciliação)
router.get('/extrato/:contaId', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    if (!dataInicio || !dataFim)
      return res.status(400).json({ error: 'Informe dataInicio e dataFim (YYYY-MM-DD).' });

    // Busca credenciais da conta
    const { data: conta, error: e1 } = await db
      .from('contas_bancarias')
      .select('inter_client_id, inter_client_secret, inter_cert_pem, inter_key_pem, nome')
      .eq('id', req.params.contaId)
      .eq('empresa_id', req.empresaId)
      .single();

    if (e1 || !conta) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (!conta.inter_client_id)
      return res.status(400).json({ error: 'Credenciais Inter não configuradas para esta conta.' });

    // Descriptografa credenciais antes de usar
    const clientSecret = decrypt(conta.inter_client_secret);
    const certPem      = decrypt(conta.inter_cert_pem);
    const keyPem       = decrypt(conta.inter_key_pem);

    // Obtém token e busca extrato
    const token     = await obterToken(conta.inter_client_id, clientSecret, certPem, keyPem);
    const extrato   = await buscarExtrato(token, certPem, keyPem, dataInicio, dataFim);

    // Normaliza para o formato padrão do FluxD (igual ao parseOfx)
    const transacoes = (extrato.transacoes || []).map((t, i) => ({
      fitid : t.codigoTransacao || `inter_${i}`,
      date  : t.dataEntrada || t.dataTransacao || dataInicio,
      amount: Math.abs(parseFloat(t.valor || 0)),
      tipo  : parseFloat(t.valor || 0) >= 0 ? 'RECEITA' : 'DESPESA',
      memo  : t.descricao || t.titulo || 'Transação Inter',
    }));

    res.json({
      conta     : conta.nome,
      dataInicio,
      dataFim,
      saldo     : extrato.saldo?.disponivel ?? null,
      transacoes,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/inter/status/:contaId ───────────────────────────────
// Testa a conexão e retorna se as credenciais são válidas
router.get('/status/:contaId', async (req, res) => {
  try {
    const { data: conta, error } = await db
      .from('contas_bancarias')
      .select('inter_client_id, inter_client_secret, inter_cert_pem, inter_key_pem, nome')
      .eq('id', req.params.contaId)
      .eq('empresa_id', req.empresaId)
      .single();

    if (error || !conta) return res.status(404).json({ error: 'Conta não encontrada.' });
    if (!conta.inter_client_id) return res.json({ conectado: false });

    // Descriptografa e testa conexão
    const clientSecret = decrypt(conta.inter_client_secret);
    const certPem      = decrypt(conta.inter_cert_pem);
    const keyPem       = decrypt(conta.inter_key_pem);
    await obterToken(conta.inter_client_id, clientSecret, certPem, keyPem);
    res.json({ conectado: true, conta: conta.nome });
  } catch (e) {
    res.json({ conectado: false, erro: e.message });
  }
});

module.exports = router;
