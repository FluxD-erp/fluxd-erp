const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');
const gcal = require('../lib/googleCalendar');

// Todas as rotas financeiras requerem auth + empresa selecionada
router.use(requireAuth, requireEmpresa);

// ── Helpers ─────────────────────────────────────────────────
/** Avança uma data por N intervalos de acordo com a frequência */
function proximaData(dataStr, frequencia, n = 1) {
  const d = new Date(dataStr + 'T12:00:00');
  const freq = {
    SEMANAL:     () => d.setDate(d.getDate() + 7 * n),
    QUINZENAL:   () => d.setDate(d.getDate() + 15 * n),
    MENSAL:      () => { const dia = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() !== dia) d.setDate(0); },
    BIMESTRAL:   () => { const dia = d.getDate(); d.setMonth(d.getMonth() + 2 * n); if (d.getDate() !== dia) d.setDate(0); },
    TRIMESTRAL:  () => { const dia = d.getDate(); d.setMonth(d.getMonth() + 3 * n); if (d.getDate() !== dia) d.setDate(0); },
    SEMESTRAL:   () => { const dia = d.getDate(); d.setMonth(d.getMonth() + 6 * n); if (d.getDate() !== dia) d.setDate(0); },
    ANUAL:       () => { const dia = d.getDate(); d.setFullYear(d.getFullYear() + n); if (d.getDate() !== dia) d.setDate(0); },
  };
  (freq[frequencia] || freq.MENSAL)();
  return d.toISOString().split('T')[0];
}

/** Gera array de parcelas para insert em bulk */
function gerarParcelas(base, numParcelas, frequencia, empresaId) {
  const grupoId = crypto.randomUUID();
  const valorParcela = Math.round((base.valor_original / numParcelas) * 100) / 100;
  // Ajusta última parcela para absorver diferença de arredondamento
  const totalParcelas = valorParcela * numParcelas;
  const diff = Math.round((base.valor_original - totalParcelas) * 100) / 100;

  return Array.from({ length: numParcelas }, (_, i) => ({
    fornecedor_id    : base.fornecedor_id || null,
    cliente_id       : base.cliente_id   || null,
    descricao        : `${base.descricao} (${i + 1}/${numParcelas})`,
    valor_original   : i === numParcelas - 1 ? valorParcela + diff : valorParcela,
    data_emissao     : base.data_emissao,
    data_vencimento  : i === 0 ? base.data_vencimento : proximaData(base.data_vencimento, frequencia, i),
    numero_documento : base.numero_documento || null,
    conta_id         : base.conta_id || null,
    observacao       : base.observacao || null,
    parcelado        : true,
    num_parcelas     : numParcelas,
    parcela_atual    : i + 1,
    grupo_id         : grupoId,
    empresa_id       : empresaId,
  }));
}

/**
 * Resolve o id do fornecedor, criando-o quando necessário.
 * Aceita um fornecedor já existente (fornecedor_id) ou um novo informado
 * como { nome, cnpj } — mesmo contrato usado pela importação de NF/CSV.
 */
async function resolverFornecedor(fornecedor_id, fornecedor_novo, empresaId) {
  if (fornecedor_id) return fornecedor_id;
  if (!fornecedor_novo?.nome) return null;

  const { data, error } = await db.from('fornecedores').insert({
    nome        : fornecedor_novo.nome,
    razao_social: fornecedor_novo.nome,
    cpf_cnpj    : fornecedor_novo.cnpj || null,
    tipo        : 'PJ',
    empresa_id  : empresaId,
    ativo       : true,
  }).select().single();

  if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`);
  return data.id;
}

// ----------------------------------------------------------------
// LANÇAMENTOS
// ----------------------------------------------------------------
router.get('/lancamentos', async (req, res) => {
  try {
    const { tipo, status, inicio, fim, search, conta_id, cliente_id, fornecedor_id } = req.query;

    let q = db.from('lancamentos')
      .select('*, clientes!cliente_id(nome), fornecedores!fornecedor_id(nome), plano_contas!conta_id(nome)')
      .eq('empresa_id', req.empresaId)
      .order('data_competencia', { ascending: false })
      .limit(200);

    if (tipo)          q = q.eq('tipo', tipo);
    if (status)        q = q.eq('status', status);
    if (inicio)        q = q.gte('data_competencia', inicio);
    if (fim)           q = q.lte('data_competencia', fim);
    if (search)        q = q.ilike('descricao', `%${search}%`);
    if (conta_id)      q = q.eq('conta_id', conta_id);
    if (cliente_id)    q = q.eq('cliente_id', cliente_id);
    if (fornecedor_id) q = q.eq('fornecedor_id', fornecedor_id);

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
      conta_id, cliente_id, fornecedor_id, numero_documento, observacao,
      conciliado, ofx_fitid, ofx_memo } = req.body;

    const { data, error } = await db.from('lancamentos')
      .insert({
        descricao, tipo, valor, data_competencia,
        data_pagamento : data_pagamento || null,
        status         : status || 'PENDENTE',
        conta_id       : conta_id || null,
        cliente_id     : cliente_id || null,
        fornecedor_id  : fornecedor_id || null,
        numero_documento, observacao,
        conciliado     : conciliado || false,
        ofx_fitid      : ofx_fitid  || null,
        ofx_memo       : ofx_memo   || null,
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
      conta_id, cliente_id, fornecedor_id, numero_documento, observacao,
      conciliado, ofx_fitid, ofx_memo } = req.body;

    const update = {
      descricao, tipo, valor, data_competencia,
      data_pagamento : data_pagamento || null,
      status,
      conta_id       : conta_id || null,
      cliente_id     : cliente_id || null,
      fornecedor_id  : fornecedor_id || null,
      numero_documento, observacao,
      atualizado_em  : new Date().toISOString(),
    };
    if (conciliado !== undefined) update.conciliado = conciliado;
    if (ofx_fitid  !== undefined) update.ofx_fitid  = ofx_fitid;
    if (ofx_memo   !== undefined) update.ofx_memo   = ofx_memo;

    const { error } = await db.from('lancamentos')
      .update(update)
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
// PATCH /lancamentos/conciliar-bulk  ← DEVE vir ANTES do /:id para o Express não
// confundir "conciliar-bulk" como parâmetro :id
// Body: { pares: [{ lancamento_id, ofx_fitid, ofx_memo }] }
// ----------------------------------------------------------------
router.patch('/lancamentos/conciliar-bulk', async (req, res) => {
  try {
    const { pares } = req.body;
    if (!Array.isArray(pares) || pares.length === 0)
      return res.status(400).json({ error: 'Nenhum par informado.' });

    const promises = pares.map(({ lancamento_id, ofx_fitid, ofx_memo }) =>
      db.from('lancamentos')
        .update({ conciliado: true, ofx_fitid, ofx_memo, atualizado_em: new Date().toISOString() })
        .eq('id', lancamento_id)
        .eq('empresa_id', req.empresaId)
    );
    const results = await Promise.all(promises);
    const erros   = results.filter(r => r.error);
    if (erros.length) throw new Error(erros[0].error.message);

    res.json({ success: true, conciliados: pares.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /lancamentos/:id/conciliar — concilia/desconcilia um único lançamento
router.patch('/lancamentos/:id/conciliar', async (req, res) => {
  try {
    const { ofx_fitid, ofx_memo, conciliado = true } = req.body;
    const { error } = await db.from('lancamentos')
      .update({
        conciliado,
        ofx_fitid    : conciliado ? ofx_fitid : null,
        ofx_memo     : conciliado ? ofx_memo  : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);
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
    const { fornecedor_id, fornecedor_novo, descricao, valor_original, data_emissao, data_vencimento,
      numero_documento, conta_id, observacao,
      parcelado, num_parcelas, frequencia,
      recorrente } = req.body;

    const fornId = await resolverFornecedor(fornecedor_id, fornecedor_novo, req.empresaId);
    if (!fornId) {
      return res.status(400).json({ error: 'Selecione um fornecedor ou informe um novo.' });
    }

    const base = {
      fornecedor_id: fornId, descricao, valor_original: parseFloat(valor_original),
      data_emissao, data_vencimento, numero_documento, conta_id: conta_id || null, observacao,
    };

    // ── Parcelado: cria N registros em bulk ──────────────────
    if (parcelado && num_parcelas > 1) {
      const parcelas = gerarParcelas(base, parseInt(num_parcelas), frequencia || 'MENSAL', req.empresaId);
      const { data, error } = await db.from('contas_pagar').insert(parcelas).select();
      if (error) throw error;
      // Cria eventos no Google Calendar (não bloqueia resposta)
      data.forEach(p => gcal.createEvent(req.empresaId, p.id, p).catch(() => {}));
      return res.status(201).json({ parcelas: data.length, grupo_id: data[0]?.grupo_id });
    }

    // ── Recorrente ou conta única ────────────────────────────
    const { data, error } = await db.from('contas_pagar')
      .insert({
        ...base,
        recorrente : recorrente || false,
        frequencia : recorrente ? (frequencia || 'MENSAL') : null,
        empresa_id : req.empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    gcal.createEvent(req.empresaId, data.id, data).catch(() => {});
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/contas-pagar/:id/pagar', async (req, res) => {
  try {
    const { valor_pago, data_pagamento } = req.body;

    const { data: conta, error: fetchErr } = await db.from('contas_pagar')
      .select('*')
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

    if (novoStatus === 'PAGA') {
      gcal.deleteEvent(req.empresaId, req.params.id).catch(() => {});
    } else {
      gcal.updateEvent(req.empresaId, req.params.id, { ...conta, status: novoStatus }).catch(() => {});
    }

    // ── Recorrente: gera próxima ocorrência ao quitar ────────
    if (novoStatus === 'PAGA' && conta.recorrente && conta.frequencia) {
      const proxVenc = proximaData(conta.data_vencimento, conta.frequencia);
      await db.from('contas_pagar').insert({
        fornecedor_id   : conta.fornecedor_id,
        descricao       : conta.descricao,
        valor_original  : conta.valor_original,
        data_emissao    : new Date().toISOString().split('T')[0],
        data_vencimento : proxVenc,
        numero_documento: conta.numero_documento,
        conta_id        : conta.conta_id,
        observacao      : conta.observacao,
        recorrente      : true,
        frequencia      : conta.frequencia,
        grupo_id        : conta.grupo_id || conta.id,
        empresa_id      : conta.empresa_id,
      });
    }

    res.json({ success: true, status: novoStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/contas-pagar/:id', async (req, res) => {
  try {
    const { fornecedor_id, fornecedor_novo, descricao, valor_original, data_emissao, data_vencimento,
      data_pagamento, valor_pago, status, numero_documento, conta_id, observacao } = req.body;

    const fornId = fornecedor_id
      ? fornecedor_id
      : await resolverFornecedor(fornecedor_id, fornecedor_novo, req.empresaId);

    if (!fornId) {
      return res.status(400).json({ error: 'Selecione um fornecedor ou informe um novo.' });
    }

    const updated = {
      fornecedor_id: fornId, descricao, valor_original, data_emissao, data_vencimento,
      data_pagamento : data_pagamento || null,
      valor_pago     : valor_pago || 0,
      status, numero_documento, conta_id: conta_id || null, observacao,
      atualizado_em  : new Date().toISOString(),
    };
    const { error } = await db.from('contas_pagar').update(updated).eq('id', req.params.id);

    if (error) throw error;
    if (status !== 'PAGA' && status !== 'CANCELADA') {
      gcal.updateEvent(req.empresaId, req.params.id, { ...updated, id: req.params.id }).catch(() => {});
    } else {
      gcal.deleteEvent(req.empresaId, req.params.id).catch(() => {});
    }
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
      numero_documento, conta_id, observacao,
      parcelado, num_parcelas, frequencia,
      recorrente } = req.body;

    const base = {
      cliente_id, descricao, valor_original: parseFloat(valor_original),
      data_emissao, data_vencimento, numero_documento, conta_id: conta_id || null, observacao,
    };

    if (parcelado && num_parcelas > 1) {
      const parcelas = gerarParcelas(base, parseInt(num_parcelas), frequencia || 'MENSAL', req.empresaId);
      const { data, error } = await db.from('contas_receber').insert(parcelas).select();
      if (error) throw error;
      return res.status(201).json({ parcelas: data.length, grupo_id: data[0]?.grupo_id });
    }

    const { data, error } = await db.from('contas_receber')
      .insert({
        ...base,
        recorrente : recorrente || false,
        frequencia : recorrente ? (frequencia || 'MENSAL') : null,
        empresa_id : req.empresaId,
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
      .select('*')
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

    // ── Recorrente: gera próxima ocorrência ao quitar ────────
    if (novoStatus === 'RECEBIDA' && conta.recorrente && conta.frequencia) {
      const proxVenc = proximaData(conta.data_vencimento, conta.frequencia);
      await db.from('contas_receber').insert({
        cliente_id      : conta.cliente_id,
        descricao       : conta.descricao,
        valor_original  : conta.valor_original,
        data_emissao    : new Date().toISOString().split('T')[0],
        data_vencimento : proxVenc,
        numero_documento: conta.numero_documento,
        conta_id        : conta.conta_id,
        observacao      : conta.observacao,
        recorrente      : true,
        frequencia      : conta.frequencia,
        grupo_id        : conta.grupo_id || conta.id,
        empresa_id      : conta.empresa_id,
      });
    }

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
// GET /financeiro/relatorio-fc — Fluxo de Caixa mensal p/ relatório
// modo=realizado: só PAGO | modo=projetado: inclui pendentes + c.pagar/receber
// ----------------------------------------------------------------
router.get('/relatorio-fc', async (req, res) => {
  try {
    const hoje       = new Date().toISOString().split('T')[0];
    const dataInicio = req.query.inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dataFim    = req.query.fim    || hoje;
    const modo       = req.query.modo   || 'realizado';

    // Lançamentos
    let q = db.from('lancamentos')
      .select('tipo, valor, data_competencia, status')
      .eq('empresa_id', req.empresaId)
      .gte('data_competencia', dataInicio)
      .lte('data_competencia', dataFim)
      .neq('tipo', 'TRANSFERENCIA');

    if (modo === 'realizado') q = q.eq('status', 'PAGO');
    else                      q = q.in('status', ['PAGO', 'PENDENTE']);

    const { data: lancs, error } = await q;
    if (error) throw error;

    // Saldo anterior (só realizado para manter base correta)
    const { data: ant } = await db.from('lancamentos')
      .select('tipo, valor')
      .eq('empresa_id', req.empresaId)
      .eq('status', 'PAGO')
      .lt('data_competencia', dataInicio)
      .neq('tipo', 'TRANSFERENCIA');

    const saldoAnterior = (ant || []).reduce((s, r) =>
      s + (r.tipo === 'RECEITA' ? Number(r.valor) : -Number(r.valor)), 0);

    // Agrupa por mês
    const meses = {};
    const addMes = (mesKey, tipo, valor) => {
      if (!meses[mesKey]) meses[mesKey] = { mes: mesKey, entradas: 0, saidas: 0, projetado_entradas: 0, projetado_saidas: 0 };
      if (tipo === 'RECEITA') meses[mesKey].entradas += valor;
      else                    meses[mesKey].saidas   += valor;
    };

    (lancs || []).forEach(r => {
      addMes(r.data_competencia.slice(0, 7), r.tipo, Number(r.valor));
    });

    // Projetado: inclui contas a pagar/receber
    if (modo === 'projetado') {
      const [{ data: cp }, { data: cr }] = await Promise.all([
        db.from('contas_pagar').select('data_vencimento, valor_original, valor_pago')
          .eq('empresa_id', req.empresaId)
          .in('status', ['ABERTA', 'PARCIAL', 'PENDENTE'])
          .gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
        db.from('contas_receber').select('data_vencimento, valor_original, valor_recebido')
          .eq('empresa_id', req.empresaId)
          .in('status', ['ABERTA', 'PARCIAL', 'PENDENTE'])
          .gte('data_vencimento', dataInicio).lte('data_vencimento', dataFim),
      ]);
      (cp || []).forEach(c => addMes(c.data_vencimento.slice(0, 7), 'DESPESA', Number(c.valor_original) - Number(c.valor_pago || 0)));
      (cr || []).forEach(c => addMes(c.data_vencimento.slice(0, 7), 'RECEITA', Number(c.valor_original) - Number(c.valor_recebido || 0)));
    }

    // Ordena e calcula saldo acumulado
    const linhas = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));
    let saldo = saldoAnterior;
    linhas.forEach(l => {
      l.resultado     = l.entradas - l.saidas;
      saldo          += l.resultado;
      l.saldo_acumulado = saldo;
    });

    const totalEntradas = linhas.reduce((s, l) => s + l.entradas, 0);
    const totalSaidas   = linhas.reduce((s, l) => s + l.saidas, 0);

    res.json({ saldo_anterior: saldoAnterior, linhas, total_entradas: totalEntradas, total_saidas: totalSaidas, resultado: totalEntradas - totalSaidas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// DRE
// ----------------------------------------------------------------
router.get('/dre', async (req, res) => {
  try {
    const hoje       = new Date().toISOString().split('T')[0];
    const dataInicio = req.query.inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dataFim    = req.query.fim    || hoje;
    const modo       = req.query.modo   || 'realizado'; // 'realizado' | 'projetado'

    // Realizado: só PAGO. Projetado: PAGO + PENDENTE
    let q = db.from('lancamentos')
      .select('tipo, valor, plano_contas!conta_id(codigo, nome)')
      .eq('empresa_id', req.empresaId)
      .gte('data_competencia', dataInicio)
      .lte('data_competencia', dataFim);

    if (modo === 'realizado') {
      q = q.eq('status', 'PAGO');
    } else {
      q = q.in('status', ['PAGO', 'PENDENTE']);
    }

    // Projetado: também inclui contas a pagar/receber abertas no período
    let rowsExtras = [];
    if (modo === 'projetado') {
      const [{ data: cp }, { data: cr }] = await Promise.all([
        db.from('contas_pagar')
          .select('valor_original, valor_pago')
          .eq('empresa_id', req.empresaId)
          .in('status', ['ABERTA', 'PARCIAL', 'PENDENTE'])
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim),
        db.from('contas_receber')
          .select('valor_original, valor_recebido')
          .eq('empresa_id', req.empresaId)
          .in('status', ['ABERTA', 'PARCIAL', 'PENDENTE'])
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim),
      ]);
      (cp || []).forEach(c => rowsExtras.push({ tipo: 'DESPESA', valor: Number(c.valor_original) - Number(c.valor_pago || 0), plano_contas: null }));
      (cr || []).forEach(c => rowsExtras.push({ tipo: 'RECEITA', valor: Number(c.valor_original) - Number(c.valor_recebido || 0), plano_contas: null }));
    }

    const { data: rows, error } = await q;

    if (error) throw error;

    const receitasMap  = {};
    const despesasMap  = {};
    let totalReceitas  = 0;
    let totalDespesas  = 0;

    [...(rows || []), ...rowsExtras].forEach(r => {
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

// ----------------------------------------------------------------
// GET /financeiro/dre/analitico — DRE com lançamentos detalhados por categoria
// ----------------------------------------------------------------
router.get('/dre/analitico', async (req, res) => {
  try {
    const hoje       = new Date().toISOString().split('T')[0];
    const dataInicio = req.query.inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dataFim    = req.query.fim    || hoje;

    const { data: rows, error } = await db.from('lancamentos')
      .select('descricao, tipo, valor, data_competencia, numero_documento, clientes!cliente_id(nome), fornecedores!fornecedor_id(nome), plano_contas!conta_id(codigo, nome)')
      .eq('empresa_id', req.empresaId)
      .eq('status', 'PAGO')
      .gte('data_competencia', dataInicio)
      .lte('data_competencia', dataFim)
      .order('data_competencia', { ascending: true });

    if (error) throw error;

    // Agrupa por categoria (conta contábil)
    const categoriasMap = {};
    let totalReceitas = 0;
    let totalDespesas = 0;

    (rows || []).forEach(r => {
      const v       = Number(r.valor);
      const codigo  = r.plano_contas?.codigo || '?';
      const nome    = r.plano_contas?.nome   || 'Sem conta';
      const tipo    = r.tipo;
      const key     = `${tipo}__${codigo}`;

      if (!categoriasMap[key]) {
        categoriasMap[key] = { codigo, nome, tipo, total: 0, lancamentos: [] };
      }

      categoriasMap[key].total += v;
      categoriasMap[key].lancamentos.push({
        data           : r.data_competencia,
        descricao      : r.descricao,
        numero_documento: r.numero_documento || null,
        cliente        : r.clientes?.nome    || null,
        fornecedor     : r.fornecedores?.nome || null,
        valor          : v,
      });

      if (tipo === 'RECEITA') totalReceitas += v;
      else                    totalDespesas += v;
    });

    const categorias = Object.values(categoriasMap)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    res.json({
      periodo        : { inicio: dataInicio, fim: dataFim },
      categorias,
      total_receitas : totalReceitas,
      total_despesas : totalDespesas,
      resultado      : totalReceitas - totalDespesas,
      margem         : totalReceitas > 0
        ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(2)
        : 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /financeiro/importar — importação bulk de lançamentos via CSV
// Body: { rows: [{ descricao, tipo, valor, data_competencia, status?, observacao? }] }
// ----------------------------------------------------------------
router.post('/importar', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: 'Nenhuma linha para importar.' });
    if (rows.length > 1000)
      return res.status(400).json({ error: 'Limite de 1000 linhas por importação.' });

    const TIPOS   = ['RECEITA', 'DESPESA'];
    const STATUS  = ['PENDENTE', 'PAGO', 'CANCELADO'];

    const registros = rows.map((r, i) => {
      const tipo   = (r.tipo   || '').toString().toUpperCase().trim();
      const status = (r.status || 'PENDENTE').toString().toUpperCase().trim();
      const valor  = parseFloat((r.valor || '').toString().replace(',', '.'));
      const data   = (r.data_competencia || r.data || '').toString().trim();

      if (!r.descricao) throw new Error(`Linha ${i + 2}: campo "descricao" obrigatório.`);
      if (!TIPOS.includes(tipo)) throw new Error(`Linha ${i + 2}: tipo "${tipo}" inválido (RECEITA ou DESPESA).`);
      if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`Linha ${i + 2}: data_competencia inválida (use AAAA-MM-DD).`);
      if (isNaN(valor) || valor <= 0) throw new Error(`Linha ${i + 2}: valor inválido.`);

      return {
        descricao       : r.descricao.toString().trim(),
        tipo,
        valor,
        data_competencia: data,
        data_pagamento  : status === 'PAGO' ? (r.data_pagamento || data) : null,
        status          : STATUS.includes(status) ? status : 'PENDENTE',
        observacao      : r.observacao ? r.observacao.toString().trim() : null,
        empresa_id      : req.empresaId,
      };
    });

    // Insere em lotes de 100 para não estourar limites
    const LOTE = 100;
    let total  = 0;
    for (let i = 0; i < registros.length; i += LOTE) {
      const lote = registros.slice(i, i + LOTE);
      const { error } = await db.from('lancamentos').insert(lote);
      if (error) throw error;
      total += lote.length;
    }

    res.json({ success: true, importados: total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /financeiro/importar-nf
// Recebe duplicatas extraídas do XML NFe e cria contas a pagar.
// Body: {
//   fornecedor_id: uuid | null,   // se null, cria fornecedor automaticamente
//   fornecedor_novo: { nome, cnpj } | null,
//   nf: { numero, serie, data_emissao, chave, valor_total },
//   duplicatas: [{ numero, vencimento, valor }],
//   conta_id: uuid | null,
// }
// ----------------------------------------------------------------
router.post('/importar-nf', async (req, res) => {
  try {
    const { fornecedor_id, fornecedor_novo, nf, duplicatas, conta_id } = req.body;

    if (!nf?.numero)              return res.status(400).json({ error: 'Dados da NF ausentes.' });
    if (!Array.isArray(duplicatas) || duplicatas.length === 0)
      return res.status(400).json({ error: 'Nenhuma duplicata informada.' });

    let fornId = fornecedor_id;

    // Cria fornecedor automaticamente se não existir
    if (!fornId && fornecedor_novo?.nome) {
      fornId = await resolverFornecedor(fornecedor_id, fornecedor_novo, req.empresaId);
    }

    if (!fornId) return res.status(400).json({ error: 'Fornecedor não identificado.' });

    // Monta as contas a pagar
    const contas = duplicatas.map(dup => ({
      fornecedor_id   : fornId,
      descricao       : `NF ${nf.numero}${nf.serie ? '/' + nf.serie : ''} — Dup. ${dup.numero}`,
      valor_original  : parseFloat(dup.valor),
      valor_pago      : 0,
      data_emissao    : nf.data_emissao,
      data_vencimento : dup.vencimento,
      numero_documento: `NF-${nf.numero}`,
      observacao      : nf.chave ? `Chave NFe: ${nf.chave}` : null,
      conta_id        : conta_id || null,
      status          : 'ABERTA',
      empresa_id      : req.empresaId,
    }));

    const { data, error } = await db.from('contas_pagar').insert(contas).select();
    if (error) throw error;

    res.status(201).json({
      success    : true,
      importadas : data.length,
      fornecedor_id: fornId,
      contas     : data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /api/financeiro/importar-contas-pagar
// Importa CSV como contas a pagar, criando fornecedores novos
// Body: { linhas: [{ descricao, valor, data_vencimento, status, observacao, fornecedor_nome }] }
// ----------------------------------------------------------------
router.post('/importar-contas-pagar', async (req, res) => {
  try {
    const { linhas } = req.body;
    if (!Array.isArray(linhas) || linhas.length === 0)
      return res.status(400).json({ error: 'Nenhuma linha enviada.' });

    // 1. Cria fornecedores novos (deduplicado por nome)
    const nomesNovos = [...new Set(
      linhas.filter(l => l.fornecedor_novo && l.fornecedor_nome).map(l => l.fornecedor_nome)
    )];

    const fornecedorMap = {}; // nome → id
    for (const nome of nomesNovos) {
      // Verifica se já existe (race condition)
      const { data: existe } = await db.from('fornecedores')
        .select('id')
        .eq('empresa_id', req.empresaId)
        .ilike('nome', nome)
        .maybeSingle();

      if (existe) {
        fornecedorMap[nome] = existe.id;
      } else {
        const { data: novo, error } = await db.from('fornecedores')
          .insert({ nome, tipo: 'JURIDICA', empresa_id: req.empresaId, ativo: true })
          .select('id')
          .single();
        if (error) throw error;
        fornecedorMap[nome] = novo.id;
      }
    }

    // 2. Monta contas a pagar — garante fornecedor_id preenchido
    const contas = [];
    for (const l of linhas) {
      let fornecedor_id = l.fornecedor_id || fornecedorMap[l.fornecedor_nome] || null;

      // Se ainda null, tenta buscar pelo nome da descrição como fallback
      if (!fornecedor_id) {
        const { data: fb } = await db.from('fornecedores')
          .select('id')
          .eq('empresa_id', req.empresaId)
          .ilike('nome', l.descricao)
          .maybeSingle();
        if (fb) fornecedor_id = fb.id;
      }

      // Último recurso: cria fornecedor com o nome da descrição
      if (!fornecedor_id) {
        const { data: fc, error: fe } = await db.from('fornecedores')
          .insert({ nome: l.descricao, tipo: 'JURIDICA', empresa_id: req.empresaId, ativo: true })
          .select('id')
          .single();
        if (fe) throw fe;
        fornecedor_id = fc.id;
      }

      contas.push({
        fornecedor_id,
        descricao       : l.descricao,
        valor_original  : parseFloat(l.valor),
        valor_pago      : 0,
        data_emissao    : l.data_vencimento,
        data_vencimento : l.data_vencimento,
        numero_documento: l.numero_documento || null,
        observacao      : l.observacao || null,
        status          : 'ABERTA',
        empresa_id      : req.empresaId,
      });
    }

    const { data, error } = await db.from('contas_pagar').insert(contas).select();
    if (error) throw error;

    res.status(201).json({
      importadas     : data.length,
      fornecedores_criados: nomesNovos.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
