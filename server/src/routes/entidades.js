const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

// ---- CNPJ Lookup via BrasilAPI ----
router.get('/cnpj/:cnpj', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!response.ok) return res.status(404).json({ error: 'CNPJ não encontrado na Receita Federal' });
    const data = await response.json();
    res.json({
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      situacao_cadastral: data.descricao_situacao_cadastral,
      atividade_principal: data.cnae_fiscal_descricao,
      data_inicio: data.data_inicio_atividade,
      natureza_juridica: data.natureza_juridica,
      porte: data.porte,
      email: data.email,
      telefone: data.ddd_telefone_1,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      socios: data.qsa || [],
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao consultar Receita Federal' });
  }
});

// ---- CLIENTES ----
router.get('/clientes', (req, res) => {
  const db = getDb();
  const { search, ativo } = req.query;
  let query = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (nome LIKE ? OR cpf_cnpj LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (ativo !== undefined) {
    query += ' AND ativo = ?';
    params.push(ativo === 'true' ? 1 : 0);
  }
  query += ' ORDER BY nome ASC';

  res.json(db.prepare(query).all(...params));
});

router.get('/clientes/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(row);
});

router.post('/clientes', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal } = req.body;

  db.prepare(`
    INSERT INTO clientes (id, tipo, nome, razao_social, cpf_cnpj, email, telefone,
      endereco, numero, complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal);

  res.status(201).json({ id, ...req.body });
});

router.put('/clientes/:id', (req, res) => {
  const db = getDb();
  const { nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, ativo } = req.body;

  db.prepare(`
    UPDATE clientes SET nome=?, razao_social=?, cpf_cnpj=?, email=?, telefone=?,
      endereco=?, numero=?, complemento=?, bairro=?, cidade=?, uf=?, cep=?,
      situacao_cadastral=?, atividade_principal=?, ativo=?,
      atualizado_em=datetime('now')
    WHERE id=?
  `).run(nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal,
    ativo !== undefined ? ativo : 1, req.params.id);

  res.json({ id: req.params.id, ...req.body });
});

router.delete('/clientes/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE clientes SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ---- FORNECEDORES ----
router.get('/fornecedores', (req, res) => {
  const db = getDb();
  const { search, ativo } = req.query;
  let query = 'SELECT * FROM fornecedores WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (nome LIKE ? OR cpf_cnpj LIKE ? OR email LIKE ? OR categoria LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (ativo !== undefined) {
    query += ' AND ativo = ?';
    params.push(ativo === 'true' ? 1 : 0);
  }
  query += ' ORDER BY nome ASC';

  res.json(db.prepare(query).all(...params));
});

router.get('/fornecedores/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM fornecedores WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json(row);
});

router.post('/fornecedores', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const { tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria } = req.body;

  db.prepare(`
    INSERT INTO fornecedores (id, tipo, nome, razao_social, cpf_cnpj, email, telefone,
      endereco, numero, complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria);

  res.status(201).json({ id, ...req.body });
});

router.put('/fornecedores/:id', (req, res) => {
  const db = getDb();
  const { nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria, ativo } = req.body;

  db.prepare(`
    UPDATE fornecedores SET nome=?, razao_social=?, cpf_cnpj=?, email=?, telefone=?,
      endereco=?, numero=?, complemento=?, bairro=?, cidade=?, uf=?, cep=?,
      situacao_cadastral=?, atividade_principal=?, categoria=?, ativo=?,
      atualizado_em=datetime('now')
    WHERE id=?
  `).run(nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
    complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal,
    categoria, ativo !== undefined ? ativo : 1, req.params.id);

  res.json({ id: req.params.id, ...req.body });
});

router.delete('/fornecedores/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE fornecedores SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
