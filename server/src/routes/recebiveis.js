/**
 * FluxD · Recebíveis de Cartão
 * Prefixo: /api/recebiveis-cartao
 */

const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth }    = require('../middleware/auth');
const { requireEmpresa } = require('../middleware/empresa');

router.use(requireAuth, requireEmpresa);

// ── GET /api/recebiveis-cartao/resumo ───────────────────────────
router.get('/resumo', async (req, res) => {
  try {
    const hoje    = new Date().toISOString().split('T')[0];
    const em7     = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
    const em30    = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const ini30   = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const iniMes  = hoje.slice(0, 7) + '-01';

    const { data, error } = await db
      .from('recebiveis_cartao')
      .select('status, valor_liquido, data_prevista, valor_bruto, taxa_mdr')
      .eq('empresa_id', req.empresaId);

    if (error) throw error;
    const rows = data || [];

    const pendentes    = rows.filter(r => r.status === 'PENDENTE');
    const recebidos    = rows.filter(r => r.status === 'RECEBIDO');
    const antecipados  = rows.filter(r => r.status === 'ANTECIPADO');

    const sum = (arr, campo = 'valor_liquido') =>
      arr.reduce((s, r) => s + Number(r[campo] || 0), 0);

    res.json({
      total_pendente     : sum(pendentes),
      total_recebido_mes : sum(recebidos.filter(r => r.data_prevista >= iniMes), 'valor_liquido'),
      previsto_7dias     : sum(pendentes.filter(r => r.data_prevista <= em7)),
      previsto_30dias    : sum(pendentes.filter(r => r.data_prevista <= em30)),
      antecipavel        : sum(pendentes),
      qtd_pendente       : pendentes.length,
      qtd_antecipado     : antecipados.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/recebiveis-cartao ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, inicio, fim, operadora } = req.query;
    let q = db
      .from('recebiveis_cartao')
      .select('*')
      .eq('empresa_id', req.empresaId)
      .order('data_prevista');

    if (status)    q = q.eq('status', status);
    if (operadora) q = q.eq('operadora', operadora);
    if (inicio)    q = q.gte('data_prevista', inicio);
    if (fim)       q = q.lte('data_prevista', fim);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/recebiveis-cartao/importar ────────────────────────
// Importação em bulk via CSV da Rede
router.post('/importar', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows?.length) return res.status(400).json({ error: 'Nenhuma linha para importar.' });

    const payload = rows.map(r => ({
      empresa_id   : req.empresaId,
      operadora    : r.operadora    || 'REDE',
      bandeira     : r.bandeira     || null,
      nsu          : r.nsu          || null,
      terminal     : r.terminal     || null,
      data_venda   : r.data_venda,
      data_prevista: r.data_prevista,
      descricao    : r.descricao    || null,
      valor_bruto  : parseFloat(r.valor_bruto)   || 0,
      taxa_mdr     : parseFloat(r.taxa_mdr)       || 0,
      valor_liquido: parseFloat(r.valor_liquido)  || 0,
      parcela_atual: parseInt(r.parcela_atual)    || 1,
      num_parcelas : parseInt(r.num_parcelas)     || 1,
      status       : 'PENDENTE',
    }));

    const { data, error } = await db
      .from('recebiveis_cartao')
      .insert(payload)
      .select('id');

    if (error) throw error;
    res.json({ importados: data.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/recebiveis-cartao/antecipar ───────────────────────
// Antecipa um conjunto de recebíveis
router.post('/antecipar', async (req, res) => {
  try {
    const { ids, taxa_antecipacao, data_credito, dias_antecipados, observacao } = req.body;
    if (!ids?.length)         return res.status(400).json({ error: 'Nenhum recebível selecionado.' });
    if (!taxa_antecipacao)    return res.status(400).json({ error: 'Taxa de antecipação obrigatória.' });

    // Busca os recebíveis selecionados
    const { data: recebíveis, error: e1 } = await db
      .from('recebiveis_cartao')
      .select('id, valor_liquido, valor_bruto')
      .in('id', ids)
      .eq('empresa_id', req.empresaId)
      .eq('status', 'PENDENTE');

    if (e1) throw e1;
    if (!recebíveis?.length) return res.status(400).json({ error: 'Nenhum recebível pendente encontrado.' });

    const valorBruto   = recebíveis.reduce((s, r) => s + Number(r.valor_liquido), 0);
    const taxa         = parseFloat(taxa_antecipacao);
    const dias         = parseInt(dias_antecipados) || 30;
    // Desconto proporcional aos dias (taxa mensal → diária)
    const taxaDiaria   = taxa / 30;
    const desconto     = Math.round(valorBruto * taxaDiaria * dias * 100) / 100;
    const valorLiquido = Math.round((valorBruto - desconto) * 100) / 100;
    const hoje         = new Date().toISOString().split('T')[0];

    // Cria o registro de antecipação
    const { data: antec, error: e2 } = await db
      .from('antecipacoes_cartao')
      .insert({
        empresa_id      : req.empresaId,
        data_solicitacao: hoje,
        data_credito    : data_credito || hoje,
        qtd_recebiveis  : recebíveis.length,
        valor_bruto     : valorBruto,
        taxa_antecipacao: taxa,
        dias_antecipados: dias,
        valor_desconto  : desconto,
        valor_liquido   : valorLiquido,
        status          : 'CONFIRMADA',
        observacao      : observacao || null,
      })
      .select()
      .single();

    if (e2) throw e2;

    // Atualiza status dos recebíveis
    const { error: e3 } = await db
      .from('recebiveis_cartao')
      .update({ status: 'ANTECIPADO', antecipacao_id: antec.id })
      .in('id', ids)
      .eq('empresa_id', req.empresaId);

    if (e3) throw e3;

    // Cria lançamento de receita (valor líquido da antecipação)
    await db.from('lancamentos').insert({
      empresa_id      : req.empresaId,
      tipo            : 'RECEITA',
      descricao       : `Antecipação Rede — ${recebíveis.length} recebível(is)`,
      valor           : valorLiquido,
      data_competencia: data_credito || hoje,
      status          : 'PAGO',
    });

    // Cria lançamento de despesa (custo da antecipação)
    await db.from('lancamentos').insert({
      empresa_id      : req.empresaId,
      tipo            : 'DESPESA',
      descricao       : `Taxa antecipação Rede — ${taxa * 100}% a.m. × ${dias}d`,
      valor           : desconto,
      data_competencia: data_credito || hoje,
      status          : 'PAGO',
    });

    res.json({ antecipacao: antec, valor_liquido: valorLiquido, desconto });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/recebiveis-cartao/:id/receber ────────────────────
router.patch('/:id/receber', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await db
      .from('recebiveis_cartao')
      .update({ status: 'RECEBIDO' })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId)
      .select()
      .single();

    if (error) throw error;

    // Cria lançamento de receita
    await db.from('lancamentos').insert({
      empresa_id      : req.empresaId,
      tipo            : 'RECEITA',
      descricao       : `Recebível Rede — ${data.descricao || data.bandeira || 'Cartão'}`,
      valor           : data.valor_liquido,
      data_competencia: hoje,
      status          : 'PAGO',
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/recebiveis-cartao (limpar todos os PENDENTE) ────
router.delete('/', async (req, res) => {
  try {
    const { error, count } = await db
      .from('recebiveis_cartao')
      .delete({ count: 'exact' })
      .eq('empresa_id', req.empresaId)
      .eq('status', 'PENDENTE');
    if (error) throw error;
    res.json({ removidos: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/recebiveis-cartao/:id ───────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await db
      .from('recebiveis_cartao')
      .update({ status: 'CANCELADO' })
      .eq('id', req.params.id)
      .eq('empresa_id', req.empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/recebiveis-cartao/antecipacoes ─────────────────────
router.get('/antecipacoes', async (req, res) => {
  try {
    const { data, error } = await db
      .from('antecipacoes_cartao')
      .select('*')
      .eq('empresa_id', req.empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
