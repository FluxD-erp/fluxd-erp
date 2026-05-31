const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');

router.use(requireAuth, requireEmpresa);

// GET /api/contas-bancarias
router.get('/', async (req, res) => {
  try {
    const { data, error } = await db
      .from('contas_bancarias')
      .select('*')
      .eq('empresa_id', req.empresaId)
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/contas-bancarias/match?bank_id=xxx&acct_id=yyy
// Retorna a conta bancária que corresponde ao arquivo OFX
router.get('/match', async (req, res) => {
  try {
    const { bank_id, acct_id } = req.query;
    const { data, error } = await db
      .from('contas_bancarias')
      .select('*')
      .eq('empresa_id', req.empresaId)
      .eq('ativo', true)
      .eq('ofx_bank_id', bank_id || '')
      .eq('ofx_acct_id', acct_id || '')
      .maybeSingle();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/contas-bancarias
router.post('/', async (req, res) => {
  try {
    const { nome, banco, banco_codigo, agencia, numero_conta, tipo, saldo_inicial, ofx_bank_id, ofx_acct_id } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const { data, error } = await db
      .from('contas_bancarias')
      .insert({
        empresa_id  : req.empresaId,
        nome,
        banco       : banco        || null,
        banco_codigo: banco_codigo || null,
        agencia     : agencia      || null,
        numero_conta: numero_conta || null,
        tipo        : tipo         || 'CORRENTE',
        saldo_inicial: parseFloat(saldo_inicial) || 0,
        ofx_bank_id : ofx_bank_id  || null,
        ofx_acct_id : ofx_acct_id  || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/contas-bancarias/:id
router.patch('/:id', async (req, res) => {
  try {
    const campos = {};
    const permitidos = ['nome','banco','banco_codigo','agencia','numero_conta','tipo','saldo_inicial','ofx_bank_id','ofx_acct_id','ativo'];
    for (const k of permitidos) {
      if (k in req.body) campos[k] = req.body[k];
    }
    const { data, error } = await db
      .from('contas_bancarias')
      .update(campos)
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/contas-bancarias/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await db
      .from('contas_bancarias')
      .update({ ativo: false })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
