const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');

// Todas as rotas financeiras requerem auth + empresa selecionada
router.use(requireAuth, requireEmpresa);

// ----------------------------------------------------------------
// LANÇAMENTOS
// ----------------------------------------------------------------
router.get('/lancamentos', async (req, res) => {
  try {
    const { tipo, status, inicio, fim, search } = req.query;

    let q = db.from('lancamentos')
      .select('*, clientes!cliente_id(nome), fornecedores!fornecedor_id(nome), plano_contas!conta_id(nome)')
      .eq('empresa_id', req.empresaId)
      .order('data_competencia', { ascending: false })
      .limit(200);

    if (tipo)   q = q.eq('tipo', tipo);
    if (status) q = q.eq('status', status);
    if (inicio) q = q.gte('data_competencia', inicio);
    if (fim)    q = q.lte('data_competencia', fim);
    if (search) q = q.ilike('descricao', `%${search}%`);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(r => ({
      ...r,
      cliente_nome    : r.clientes?.nome       || null,
      fornecedor_nome : r.fornecedores?.nome    || null,
      conta_nome      : r.plano_contas?.nome    || null,
      clientes        : undefined,
      fornecedores    : undefined,
      plano_contas    : undefined,
    }));

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/lancamentos', async (req, res) => {
  try {
    const { descricao, tipo, valor, data_competencia, data_pagamento, status,
      conta_id, cliente_id, fornecedor_id, numero_documento, observacao } = req.body;

    const { data, error } = await db.from('lancamentos')
      .insert({
        descricao, tipo, valor, data_competencia,
        data_pagamento : data_pagamento || null,
        status         : status || 'PENDENTE',
        conta_id       : conta_id || null,
        cliente_id     : cliente_id || null,
        fornecedor_id  : fornecedor_id || null,
        numero_documento, observacao,
        empresa_id     : req.empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/lancamentos/:id', async (req, res) => {
  try {
    const { descricao, tipo, valor, data_competencia, data_pagamento, status,
      conta_id, cliente_id, fornecedor_id, numero_documento, observacao } = req.body;

    const { error } = await db.from('lancamentos')
      .update({
        descricao, tipo, valor, data_competencia,
        data_pagamento : data_pagamento || null,
        status,
        conta_id       : conta_id || null,
        cliente_id     : cliente_id || null,
        fornecedor_id  : fornecedor_id || null,
        numero_documento, observacao,
        atualizado_em  : new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/lancamentos/:id', async (req, res) => {
  try {
    const { error } = await db.from('lancamentos')
      .update({ status: 'CANCELADO' })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// CONTAS A PAGAR
// ----------------------------------------------------------------
router.get('/contas-pagar', async (req, res) => {
  try {
    const { status, inicio, fim, search } = req.query;

    let q = db.from('contas_pagar')
      .select('*, fornecedores!fornecedor_id(nome, cpf_cnpj)')
      .eq('empresa_id', req.empresaId)
      .order('data_vencimento', { ascending: true });

    if (status) q = q.eq('status', status);
    if (inicio) q = q.gte('data_vencimento', inicio);
    if (fim)    q = q.lte('data_vencimento', fim);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data || []).map(r => ({
      ...r,
      fornecedor_nome : r.fornecedores?.nome     || null,
      fornecedor_doc  : r.fornecedores?.cpf_cnpj || null,
      fornecedores    : undefined,
    }));

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.descricao?.toLowerCase().includes(s) ||
        r.fornecedor_nome?.toLowerCase().includes(s)
      );
    }

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/contas-pagar', async (req, res) => {
  try {
    const { fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
      numero_documento, conta_id, observacao } = req.body;

    const { data, error } = await db.from('contas_pagar')
      .insert({
        fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
        numero_documento, conta_id: conta_id || null, observacao,
        empresa_id: req.empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/contas-pagar/:id/pagar', async (req, res) => {
  try {
    const { valor_pago, data_pagamento } = req.body;

    const { data: conta, error: fetchErr } = await db.from('contas_pagar')
      .select('valor_original, valor_pago')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !conta) return res.status(404).json({ error: 'Conta não encontrada' });

    const totalPago  = Number(conta.valor_pago || 0) + Number(valor_pago);
    const novoStatus = totalPago >= Number(conta.valor_original) ? 'PAGA' : 'PARCIAL';

    const { error } = await db.from('contas_pagar')
      .update({
        valor_pago    : totalPago,
        data_pagamento: data_pagamento || new Date().toISOString().split('T')[0],
        status        : novoStatus,
        atualizado_em : new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, status: novoStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/contas-pagar/:id', async (req, res) => {
  try {
    const { fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
      data_pagamento, valor_pago, status, numero_documento, conta_id, observacao } = req.body;

    const { error } = await db.from('contas_pagar')
      .update({
        fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
        data_pagamento : data_pagamento || null,
        valor_pago     : valor_pago || 0,
        status, numero_documento, conta_id: conta_id || null, observacao,
        atualizado_em  : new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// CONTAS A RECEBER
// ----------------------------------------------------------------
router.get('/contas-receber', async (req, res) => {
  try {
    const { status, inicio, fim, search } = req.query;

    let q = db.from('contas_receber')
      .select('*, clientes!cliente_id(nome, cpf_cnpj)')
      .eq('empresa_id', req.empresaId)
      .order('data_vencimento', { ascending: true });

    if (status) q = q.eq('status', status);
    if (inicio) q = q.gte('data_vencimento', inicio);
    if (fim)    q = q.lte('data_vencimento', fim);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data || []).map(r => ({
      ...r,
      cliente_nome : r.clientes?.nome     || null,
      cliente_doc  : r.clientes?.cpf_cnpj || null,
      clientes     : undefined,
    }));

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.descricao?.toLowerCase().includes(s) ||
        r.cliente_nome?.toLowerCase().includes(s)
      );
    }

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/contas-receber', async (req, res) => {
  try {
    const { cliente_id, descricao, valor_original, data_emissao, data_vencimento,
      numero_documento, conta_id, observacao } = req.body;

    const { data, error } = await db.from('contas_receber')
      .insert({
        cliente_id, descricao, valor_original, data_emissao, data_vencimento,
        numero_documento, conta_id: conta_id || null, observacao,
        empresa_id: req.empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/contas-receber/:id/receber', async (req, res) => {
  try {
    const { valor_recebido, data_recebimento } = req.body;

    const { data: conta, error: fetchErr } = await db.from('contas_receber')
      .select('valor_original, valor_recebido')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !conta) return res.status(404).json({ error: 'Conta não encontrada' });

    const totalRecebido = Number(conta.valor_recebido || 0) + Number(valor_recebido);
    const novoStatus    = totalRecebido >= Number(conta.valor_original) ? 'RECEBIDA' : 'PARCIAL';

    const { error } = await db.from('contas_receber')
      .update({
        valor_recebido : totalRecebido,
        data_recebimento: data_recebimento || new Date().toISOString().split('T')[0],
        status         : novoStatus,
        atualizado_em  : new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, status: novoStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/contas-receber/:id', async (req, res) => {
  try {
    const { cliente_id, descricao, valor_original, data_emissao, data_vencimento,
      data_recebimento, valor_recebido, status, numero_documento, conta_id, observacao } = req.body;

    const { error } = await db.from('contas_receber')
      .update({
        cliente_id, descricao, valor_original, data_emissao, data_vencimento,
        data_recebimento: data_recebimento || null,
        valor_recebido  : valor_recebido || 0,
        status, numero_documento, conta_id: conta_id || null, observacao,
        atualizado_em   : new Date().toISOString(),
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// PLANO DE CONTAS
// ----------------------------------------------------------------
router.get('/plano-contas', async (req, res) => {
  try {
    const { data, error } = await db.from('plano_contas')
      .select('*')
      .eq('empresa_id', req.empresaId)
      .eq('ativo', true)
      .order('codigo', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// FLUXO DE CAIXA
// ----------------------------------------------------------------
router.get('/fluxo-caixa', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const hoje     = new Date();
    const dataInicio = inicio || new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const dataFim    = fim    || new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

    const [{ data: periodo }, { data: anterior }] = await Promise.all([
      db.from('lancamentos')
        .select('data_competencia, descricao, valor, tipo, status')
        .eq('empresa_id', req.empresaId)
        .gte('data_competencia', dataInicio)
        .lte('data_competencia', dataFim)
        .order('data_competencia', { ascending: true }),

      db.from('lancamentos')
        .select('tipo, valor, status')
        .eq('empresa_id', req.empresaId)
        .eq('status', 'PAGO')
        .lt('data_competencia', dataInicio),
    ]);

    const saldoAnterior = (anterior || []).reduce((acc, r) => {
      return acc + (r.tipo === 'RECEITA' ? Number(r.valor) : -Number(r.valor));
    }, 0);

    let saldo = saldoAnterior;
    const movimentos = (periodo || []).map(m => {
      if (m.tipo === 'RECEITA' && m.status === 'PAGO') saldo += Number(m.valor);
      if (m.tipo === 'DESPESA' && m.status === 'PAGO') saldo -= Number(m.valor);
      return { ...m, saldo_acumulado: saldo };
    });

    res.json({ saldo_anterior: saldoAnterior, movimentos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// DRE
// ----------------------------------------------------------------
router.get('/dre', async (req, res) => {
  try {
    const hoje     = new Date().toISOString().split('T')[0];
    const dataInicio = req.query.inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dataFim    = req.query.fim    || hoje;

    const { data: rows, error } = await db.from('lancamentos')
      .select('tipo, valor, plano_contas!conta_id(codigo, nome)')
      .eq('empresa_id', req.empresaId)
      .eq('status', 'PAGO')
      .gte('data_competencia', dataInicio)
      .lte('data_competencia', dataFim);

    if (error) throw error;

    const receitasMap  = {};
    const despesasMap  = {};
    let totalReceitas  = 0;
    let totalDespesas  = 0;

    (rows || []).forEach(r => {
      const v    = Number(r.valor);
      const key  = r.plano_contas?.codigo || '?';
      const nome = r.plano_contas?.nome   || 'Sem conta';

      if (r.tipo === 'RECEITA') {
        totalReceitas += v;
        if (!receitasMap[key]) receitasMap[key] = { codigo: key, nome, total: 0 };
        receitasMap[key].total += v;
      } else {
        totalDespesas += v;
        if (!despesasMap[key]) despesasMap[key] = { codigo: key, nome, total: 0 };
        despesasMap[key].total += v;
      }
    });

    const receitas = Object.values(receitasMap).sort((a, b) => a.codigo.localeCompare(b.codigo));
    const despesas = Object.values(despesasMap).sort((a, b) => a.codigo.localeCompare(b.codigo));

    res.json({
      periodo       : { inicio: dataInicio, fim: dataFim },
      receitas,
      despesas,
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      resultado     : totalReceitas - totalDespesas,
      margem        : totalReceitas > 0
        ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(2)
        : 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
