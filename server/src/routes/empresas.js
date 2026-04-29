/**
 * FluxD · Rotas de empresas (multi-tenant)
 * Prefixo: /api/empresas
 */

const express = require('express');
const router  = express.Router();
const { requireAuth, supabaseAdmin } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(requireAuth);

// Plano de contas padrão copiado para cada nova empresa
const PLANO_PADRAO = [
  { codigo: '1',     nome: 'ATIVO',                          tipo: 'ATIVO',    grau: 1 },
  { codigo: '1.1',   nome: 'ATIVO CIRCULANTE',               tipo: 'ATIVO',    grau: 2 },
  { codigo: '1.1.1', nome: 'Caixa e Equivalentes',           tipo: 'ATIVO',    grau: 3 },
  { codigo: '1.1.2', nome: 'Contas a Receber',               tipo: 'ATIVO',    grau: 3 },
  { codigo: '1.1.3', nome: 'Estoques',                       tipo: 'ATIVO',    grau: 3 },
  { codigo: '1.2',   nome: 'ATIVO NÃO CIRCULANTE',           tipo: 'ATIVO',    grau: 2 },
  { codigo: '1.2.1', nome: 'Imobilizado',                    tipo: 'ATIVO',    grau: 3 },
  { codigo: '2',     nome: 'PASSIVO',                        tipo: 'PASSIVO',  grau: 1 },
  { codigo: '2.1',   nome: 'PASSIVO CIRCULANTE',             tipo: 'PASSIVO',  grau: 2 },
  { codigo: '2.1.1', nome: 'Fornecedores',                   tipo: 'PASSIVO',  grau: 3 },
  { codigo: '2.1.2', nome: 'Obrigações Trabalhistas',        tipo: 'PASSIVO',  grau: 3 },
  { codigo: '2.1.3', nome: 'Obrigações Tributárias',         tipo: 'PASSIVO',  grau: 3 },
  { codigo: '2.2',   nome: 'PASSIVO NÃO CIRCULANTE',         tipo: 'PASSIVO',  grau: 2 },
  { codigo: '2.2.1', nome: 'Empréstimos e Financiamentos',   tipo: 'PASSIVO',  grau: 3 },
  { codigo: '3',     nome: 'RECEITAS',                       tipo: 'RECEITA',  grau: 1 },
  { codigo: '3.1',   nome: 'Receita Bruta de Serviços',      tipo: 'RECEITA',  grau: 2 },
  { codigo: '3.2',   nome: 'Receita Bruta de Produtos',      tipo: 'RECEITA',  grau: 2 },
  { codigo: '3.3',   nome: 'Receitas Financeiras',           tipo: 'RECEITA',  grau: 2 },
  { codigo: '3.4',   nome: 'Outras Receitas',                tipo: 'RECEITA',  grau: 2 },
  { codigo: '4',     nome: 'DESPESAS',                       tipo: 'DESPESA',  grau: 1 },
  { codigo: '4.1',   nome: 'Despesas com Pessoal',           tipo: 'DESPESA',  grau: 2 },
  { codigo: '4.1.1', nome: 'Salários e Encargos',            tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.1.2', nome: 'Benefícios',                     tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.2',   nome: 'Despesas Operacionais',          tipo: 'DESPESA',  grau: 2 },
  { codigo: '4.2.1', nome: 'Aluguel e Condomínio',           tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.2.2', nome: 'Serviços de Terceiros',          tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.2.3', nome: 'Energia e Telecomunicações',     tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.3',   nome: 'Despesas Tributárias',           tipo: 'DESPESA',  grau: 2 },
  { codigo: '4.3.1', nome: 'Impostos e Taxas',               tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.4',   nome: 'Despesas Financeiras',           tipo: 'DESPESA',  grau: 2 },
  { codigo: '4.4.1', nome: 'Juros e IOF',                    tipo: 'DESPESA',  grau: 3 },
  { codigo: '4.5',   nome: 'Outras Despesas',                tipo: 'DESPESA',  grau: 2 },
];

// ----------------------------------------------------------------
// GET /api/empresas — lista empresas do usuário logado
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('usuarios_empresas')
      .select('perfil, empresas(*)')
      .eq('user_id', req.user.id)
      .eq('ativo', true);

    if (error) throw error;

    // Admin global: também vê empresas sem vínculo
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('perfil')
      .eq('id', req.user.id)
      .single();

    let empresas = (data || [])
      .filter(ue => ue.empresas)
      .map(ue => ({ ...ue.empresas, meu_perfil: ue.perfil }));

    if (profile?.perfil === 'ADMIN' && empresas.length === 0) {
      // Admin sem vínculo: lista todas as empresas ativas
      const { data: todas } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      empresas = (todas || []).map(e => ({ ...e, meu_perfil: 'ADMIN' }));
    }

    res.json(empresas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /api/empresas — cria nova empresa e vincula o criador como ADMIN
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { nome, cnpj, logo_url } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    // Cria a empresa
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('empresas')
      .insert({ nome, cnpj: cnpj || null, logo_url: logo_url || null })
      .select()
      .single();

    if (empErr) throw empErr;

    // Vincula o criador como ADMIN
    await supabaseAdmin.from('usuarios_empresas').insert({
      user_id    : req.user.id,
      empresa_id : emp.id,
      perfil     : 'ADMIN',
    });

    // Semeia plano de contas padrão
    const planoRows = PLANO_PADRAO.map(p => ({
      ...p,
      empresa_id : emp.id,
      ativo      : true,
    }));
    await supabaseAdmin.from('plano_contas').insert(planoRows);

    res.status(201).json(emp);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// GET /api/empresas/:id — dados de uma empresa
// ----------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Empresa não encontrada.' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// PUT /api/empresas/:id — atualiza dados da empresa
// ----------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { nome, cnpj, logo_url, ativo } = req.body;
    const updates = {};
    if (nome      !== undefined) updates.nome      = nome;
    if (cnpj      !== undefined) updates.cnpj      = cnpj;
    if (logo_url  !== undefined) updates.logo_url  = logo_url;
    if (ativo     !== undefined) updates.ativo     = ativo;

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// GET /api/empresas/:id/usuarios — lista usuários da empresa
// ----------------------------------------------------------------
router.get('/:id/usuarios', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('usuarios_empresas')
      .select('*, profiles(id, nome, email, perfil)')
      .eq('empresa_id', req.params.id)
      .eq('ativo', true)
      .order('criado_em');

    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /api/empresas/:id/usuarios — vincula usuário à empresa
// Body: { user_id, perfil? }
// ----------------------------------------------------------------
router.post('/:id/usuarios', async (req, res) => {
  try {
    const { user_id, perfil = 'VISUALIZACAO' } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id é obrigatório.' });

    const { data, error } = await supabaseAdmin
      .from('usuarios_empresas')
      .upsert(
        { user_id, empresa_id: req.params.id, perfil, ativo: true },
        { onConflict: 'user_id,empresa_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// PATCH /api/empresas/:id/usuarios/:userId — atualiza perfil do usuário
// Body: { perfil?, ativo? }
// ----------------------------------------------------------------
router.patch('/:id/usuarios/:userId', async (req, res) => {
  try {
    const { perfil, ativo } = req.body;
    const updates = {};
    if (perfil !== undefined) updates.perfil = perfil;
    if (ativo  !== undefined) updates.ativo  = ativo;

    const { error } = await supabaseAdmin
      .from('usuarios_empresas')
      .update(updates)
      .eq('empresa_id', req.params.id)
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
