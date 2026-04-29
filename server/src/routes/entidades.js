const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const fetch   = require('node-fetch');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');

// ----------------------------------------------------------------
// CNPJ Lookup via BrasilAPI
// ----------------------------------------------------------------
router.get('/cnpj/:cnpj', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!response.ok) return res.status(404).json({ error: 'CNPJ não encontrado na Receita Federal' });
    const data = await response.json();
    res.json({
      cnpj                : data.cnpj,
      razao_social        : data.razao_social,
      nome_fantasia       : data.nome_fantasia,
      situacao_cadastral  : data.descricao_situacao_cadastral,
      atividade_principal : data.cnae_fiscal_descricao,
      data_inicio         : data.data_inicio_atividade,
      natureza_juridica   : data.natureza_juridica,
      porte               : data.porte,
      email               : data.email,
      telefone            : data.ddd_telefone_1,
      logradouro          : data.logradouro,
      numero              : data.numero,
      complemento         : data.complemento,
      bairro              : data.bairro,
      municipio           : data.municipio,
      uf                  : data.uf,
      cep                 : data.cep,
      socios              : data.qsa || [],
    });
  } catch {
    res.status(500).json({ error: 'Erro ao consultar Receita Federal' });
  }
});

// ----------------------------------------------------------------
// CLIENTES
// ----------------------------------------------------------------
router.get('/clientes', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { search, ativo } = req.query;

    let q = db.from('clientes').select('*')
      .eq('empresa_id', req.empresaId)
      .order('nome', { ascending: true });

    if (ativo !== undefined) q = q.eq('ativo', ativo === 'true');
    if (search) q = q.or(`nome.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/clientes/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { data, error } = await db.from('clientes').select('*')
      .eq('id', req.params.id).eq('empresa_id', req.empresaId).single();
    if (error || !data) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/clientes', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
      complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal } = req.body;

    const { data, error } = await db.from('clientes')
      .insert({ tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
        complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal,
        empresa_id: req.empresaId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/clientes/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
      complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, ativo } = req.body;

    const { error } = await db.from('clientes')
      .update({ nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
        complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal,
        ativo: ativo !== undefined ? Boolean(ativo) : true,
        atualizado_em: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);

    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/clientes/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { error } = await db.from('clientes')
      .update({ ativo: false, atualizado_em: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// FORNECEDORES
// ----------------------------------------------------------------
router.get('/fornecedores', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { search, ativo } = req.query;

    let q = db.from('fornecedores').select('*')
      .eq('empresa_id', req.empresaId)
      .order('nome', { ascending: true });

    if (ativo !== undefined) q = q.eq('ativo', ativo === 'true');
    if (search) q = q.or(`nome.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,email.ilike.%${search}%,categoria.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/fornecedores/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { data, error } = await db.from('fornecedores').select('*')
      .eq('id', req.params.id).eq('empresa_id', req.empresaId).single();
    if (error || !data) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/fornecedores', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
      complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria } = req.body;

    const { data, error } = await db.from('fornecedores')
      .insert({ tipo, nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
        complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria,
        empresa_id: req.empresaId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/fornecedores/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
      complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria, ativo } = req.body;

    const { error } = await db.from('fornecedores')
      .update({ nome, razao_social, cpf_cnpj, email, telefone, endereco, numero,
        complemento, bairro, cidade, uf, cep, situacao_cadastral, atividade_principal, categoria,
        ativo: ativo !== undefined ? Boolean(ativo) : true,
        atualizado_em: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);

    if (error) throw error;
    res.json({ id: req.params.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/fornecedores/:id', requireAuth, requireEmpresa, async (req, res) => {
  try {
    const { error } = await db.from('fornecedores')
      .update({ ativo: false, atualizado_em: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
