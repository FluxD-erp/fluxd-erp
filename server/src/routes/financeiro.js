const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { v4: uuidv4 } = require('uuid');

// ---- LANÇAMENTOS ----
router.get('/lancamentos', (req, res) => {
  const db = getDb();
  const { tipo, status, inicio, fim, search } = req.query;
  let query = `
    SELECT l.*, c.nome as cliente_nome, f.nome as fornecedor_nome, p.nome as conta_nome
    FROM lancamentos l
    LEFT JOIN clientes c ON l.cliente_id = c.id
    LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
    LEFT JOIN plano_contas p ON l.conta_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (tipo) { query += ' AND l.tipo = ?'; params.push(tipo); }
  if (status) { query += ' AND l.status = ?'; params.push(status); }
  if (inicio) { query += ' AND l.data_competencia >= ?'; params.push(inicio); }
  if (fim) { query += ' AND l.data_competencia <= ?'; params.push(fim); }
  if (search) { query += ' AND l.descricao LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY l.data_competencia DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

router.post('/lancamentos', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { descricao, tipo, valor, data_competencia, data_pagamento, status,
    conta_id, cliente_id, fornecedor_id, numero_documento, observacao } = req.body;

  db.prepare(`
    INSERT INTO lancamentos (id, descricao, tipo, valor, data_competencia, data_pagamento,
      status, conta_id, cliente_id, fornecedor_id, numero_documento, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, descricao, tipo, valor, data_competencia, data_pagamento,
    status || 'PENDENTE', conta_id, cliente_id, fornecedor_id, numero_documento, observacao);

  res.status(201).json({ id, ...req.body });
});

router.put('/lancamentos/:id', (req, res) => {
  const db = getDb();
  const { descricao, tipo, valor, data_competencia, data_pagamento, status,
    conta_id, cliente_id, fornecedor_id, numero_documento, observacao } = req.body;

  db.prepare(`
    UPDATE lancamentos SET descricao=?, tipo=?, valor=?, data_competencia=?,
      data_pagamento=?, status=?, conta_id=?, cliente_id=?, fornecedor_id=?,
      numero_documento=?, observacao=?, atualizado_em=datetime('now')
    WHERE id=?
  `).run(descricao, tipo, valor, data_competencia, data_pagamento, status,
    conta_id, cliente_id, fornecedor_id, numero_documento, observacao, req.params.id);

  res.json({ id: req.params.id, ...req.body });
});

router.delete('/lancamentos/:id', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE lancamentos SET status='CANCELADO' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// ---- CONTAS A PAGAR ----
router.get('/contas-pagar', (req, res) => {
  const db = getDb();
  const { status, inicio, fim, search } = req.query;
  let query = `
    SELECT cp.*, f.nome as fornecedor_nome, f.cpf_cnpj as fornecedor_doc
    FROM contas_pagar cp
    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND cp.status = ?'; params.push(status); }
  if (inicio) { query += ' AND cp.data_vencimento >= ?'; params.push(inicio); }
  if (fim) { query += ' AND cp.data_vencimento <= ?'; params.push(fim); }
  if (search) { query += ' AND (cp.descricao LIKE ? OR f.nome LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY cp.data_vencimento ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/contas-pagar', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
    numero_documento, conta_id, observacao } = req.body;

  db.prepare(`
    INSERT INTO contas_pagar (id, fornecedor_id, descricao, valor_original, data_emissao,
      data_vencimento, numero_documento, conta_id, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, fornecedor_id, descricao, valor_original, data_emissao,
    data_vencimento, numero_documento, conta_id, observacao);

  res.status(201).json({ id, ...req.body });
});

router.patch('/contas-pagar/:id/pagar', (req, res) => {
  const db = getDb();
  const { valor_pago, data_pagamento } = req.body;
  const conta = db.prepare('SELECT * FROM contas_pagar WHERE id=?').get(req.params.id);
  if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

  const totalPago = (conta.valor_pago || 0) + valor_pago;
  const novoStatus = totalPago >= conta.valor_original ? 'PAGA' : 'PARCIAL';

  db.prepare(`
    UPDATE contas_pagar SET valor_pago=?, data_pagamento=?, status=?, atualizado_em=datetime('now')
    WHERE id=?
  `).run(totalPago, data_pagamento || new Date().toISOString().split('T')[0], novoStatus, req.params.id);

  res.json({ success: true, status: novoStatus });
});

router.put('/contas-pagar/:id', (req, res) => {
  const db = getDb();
  const { fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
    data_pagamento, valor_pago, status, numero_documento, conta_id, observacao } = req.body;

  db.prepare(`
    UPDATE contas_pagar SET fornecedor_id=?, descricao=?, valor_original=?, data_emissao=?,
      data_vencimento=?, data_pagamento=?, valor_pago=?, status=?, numero_documento=?,
      conta_id=?, observacao=?, atualizado_em=datetime('now')
    WHERE id=?
  `).run(fornecedor_id, descricao, valor_original, data_emissao, data_vencimento,
    data_pagamento, valor_pago, status, numero_documento, conta_id, observacao, req.params.id);

  res.json({ id: req.params.id, ...req.body });
});

// ---- CONTAS A RECEBER ----
router.get('/contas-receber', (req, res) => {
  const db = getDb();
  const { status, inicio, fim, search } = req.query;
  let query = `
    SELECT cr.*, c.nome as cliente_nome, c.cpf_cnpj as cliente_doc
    FROM contas_receber cr
    LEFT JOIN clientes c ON cr.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND cr.status = ?'; params.push(status); }
  if (inicio) { query += ' AND cr.data_vencimento >= ?'; params.push(inicio); }
  if (fim) { query += ' AND cr.data_vencimento <= ?'; params.push(fim); }
  if (search) { query += ' AND (cr.descricao LIKE ? OR c.nome LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY cr.data_vencimento ASC';
  res.json(db.prepare(query).all(...params));
});

router.post('/contas-receber', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { cliente_id, descricao, valor_original, data_emissao, data_vencimento,
    numero_documento, conta_id, observacao } = req.body;

  db.prepare(`
    INSERT INTO contas_receber (id, cliente_id, descricao, valor_original, data_emissao,
      data_vencimento, numero_documento, conta_id, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, cliente_id, descricao, valor_original, data_emissao,
    data_vencimento, numero_documento, conta_id, observacao);

  res.status(201).json({ id, ...req.body });
});

router.patch('/contas-receber/:id/receber', (req, res) => {
  const db = getDb();
  const { valor_recebido, data_recebimento } = req.body;
  const conta = db.prepare('SELECT * FROM contas_receber WHERE id=?').get(req.params.id);
  if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });

  const totalRecebido = (conta.valor_recebido || 0) + valor_recebido;
  const novoStatus = totalRecebido >= conta.valor_original ? 'RECEBIDA' : 'PARCIAL';

  db.prepare(`
    UPDATE contas_receber SET valor_recebido=?, data_recebimento=?, status=?, atualizado_em=datetime('now')
    WHERE id=?
  `).run(totalRecebido, data_recebimento || new Date().toISOString().split('T')[0], novoStatus, req.params.id);

  res.json({ success: true, status: novoStatus });
});

router.put('/contas-receber/:id', (req, res) => {
  const db = getDb();
  const { cliente_id, descricao, valor_original, data_emissao, data_vencimento,
    data_recebimento, valor_recebido, status, numero_documento, conta_id, observacao } = req.body;

  db.prepare(`
    UPDATE contas_receber SET cliente_id=?, descricao=?, valor_original=?, data_emissao=?,
      data_vencimento=?, data_recebimento=?, valor_recebido=?, status=?, numero_documento=?,
      conta_id=?, observacao=?, atualizado_em=datetime('now')
    WHERE id=?
  `).run(cliente_id, descricao, valor_original, data_emissao, data_vencimento,
    data_recebimento, valor_recebido, status, numero_documento, conta_id, observacao, req.params.id);

  res.json({ id: req.params.id, ...req.body });
});

// ---- PLANO DE CONTAS ----
router.get('/plano-contas', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM plano_contas WHERE ativo=1 ORDER BY codigo ASC').all();
  res.json(rows);
});

// ---- FLUXO DE CAIXA ----
router.get('/fluxo-caixa', (req, res) => {
  const db = getDb();
  const { inicio, fim } = req.query;
  const dataInicio = inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const dataFim = fim || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const entradas = db.prepare(`
    SELECT data_competencia as data, descricao, valor, 'RECEITA' as tipo, status
    FROM lancamentos
    WHERE tipo = 'RECEITA' AND data_competencia BETWEEN ? AND ?
    ORDER BY data_competencia ASC
  `).all(dataInicio, dataFim);

  const saidas = db.prepare(`
    SELECT data_competencia as data, descricao, valor, 'DESPESA' as tipo, status
    FROM lancamentos
    WHERE tipo = 'DESPESA' AND data_competencia BETWEEN ? AND ?
    ORDER BY data_competencia ASC
  `).all(dataInicio, dataFim);

  const saldoAnterior = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN tipo='RECEITA' THEN valor ELSE -valor END), 0) as saldo
    FROM lancamentos
    WHERE status = 'PAGO' AND data_competencia < ?
  `).get(dataInicio);

  const movimentos = [...entradas, ...saidas].sort((a, b) => a.data.localeCompare(b.data));

  let saldo = saldoAnterior.saldo;
  const fluxo = movimentos.map(m => {
    if (m.tipo === 'RECEITA' && m.status === 'PAGO') saldo += m.valor;
    if (m.tipo === 'DESPESA' && m.status === 'PAGO') saldo -= m.valor;
    return { ...m, saldo_acumulado: saldo };
  });

  res.json({ saldo_anterior: saldoAnterior.saldo, movimentos: fluxo });
});

// ---- RELATÓRIOS ----
router.get('/dre', (req, res) => {
  const db = getDb();
  const { inicio, fim } = req.query;
  const dataInicio = inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const dataFim = fim || new Date().toISOString().split('T')[0];

  const receitas = db.prepare(`
    SELECT p.codigo, p.nome, COALESCE(SUM(l.valor), 0) as total
    FROM lancamentos l
    JOIN plano_contas p ON l.conta_id = p.id
    WHERE l.tipo = 'RECEITA' AND l.status = 'PAGO'
    AND l.data_competencia BETWEEN ? AND ?
    GROUP BY p.id ORDER BY p.codigo
  `).all(dataInicio, dataFim);

  const despesas = db.prepare(`
    SELECT p.codigo, p.nome, COALESCE(SUM(l.valor), 0) as total
    FROM lancamentos l
    JOIN plano_contas p ON l.conta_id = p.id
    WHERE l.tipo = 'DESPESA' AND l.status = 'PAGO'
    AND l.data_competencia BETWEEN ? AND ?
    GROUP BY p.id ORDER BY p.codigo
  `).all(dataInicio, dataFim);

  const totalReceitas = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos
    WHERE tipo='RECEITA' AND status='PAGO' AND data_competencia BETWEEN ? AND ?
  `).get(dataInicio, dataFim).total;

  const totalDespesas = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos
    WHERE tipo='DESPESA' AND status='PAGO' AND data_competencia BETWEEN ? AND ?
  `).get(dataInicio, dataFim).total;

  res.json({
    periodo: { inicio: dataInicio, fim: dataFim },
    receitas,
    despesas,
    total_receitas: totalReceitas,
    total_despesas: totalDespesas,
    resultado: totalReceitas - totalDespesas,
    margem: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(2) : 0,
  });
});

module.exports = router;
