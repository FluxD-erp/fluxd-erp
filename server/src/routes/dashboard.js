const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');

// ----------------------------------------------------------------
// GET /api/dashboard/kpis
// ----------------------------------------------------------------
router.get('/kpis', async (req, res) => {
  try {
    const hoje      = new Date().toISOString().split('T')[0];
    const inicioMes = hoje.slice(0, 7) + '-01';
    const em7Dias   = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const [
      { data: receitasRows },
      { data: despesasRows },
      { data: pagarAberto },
      { data: receberAberto },
      { data: vencidasRows },
      { data: aVencerRows },
    ] = await Promise.all([
      db.from('lancamentos').select('valor')
        .eq('tipo', 'RECEITA').eq('status', 'PAGO')
        .gte('data_competencia', inicioMes).lte('data_competencia', hoje),

      db.from('lancamentos').select('valor')
        .eq('tipo', 'DESPESA').eq('status', 'PAGO')
        .gte('data_competencia', inicioMes).lte('data_competencia', hoje),

      db.from('contas_pagar').select('valor_original,valor_pago')
        .in('status', ['ABERTA', 'PARCIAL']),

      db.from('contas_receber').select('valor_original,valor_recebido')
        .in('status', ['ABERTA', 'PARCIAL']),

      db.from('contas_pagar').select('valor_original,valor_pago')
        .eq('status', 'VENCIDA'),

      db.from('contas_pagar').select('id')
        .eq('status', 'ABERTA')
        .gte('data_vencimento', hoje)
        .lte('data_vencimento', em7Dias),
    ]);

    const sum     = (rows, field)    => (rows || []).reduce((acc, r) => acc + Number(r[field] || 0), 0);
    const sumDiff = (rows, a, b)     => (rows || []).reduce((acc, r) => acc + Number(r[a] || 0) - Number(r[b] || 0), 0);

    const receitaMes  = sum(receitasRows, 'valor');
    const despesaMes  = sum(despesasRows, 'valor');

    res.json({
      receita_mes   : receitaMes,
      despesa_mes   : despesaMes,
      resultado_mes : receitaMes - despesaMes,
      contas_pagar  : { total: sumDiff(pagarAberto,  'valor_original', 'valor_pago'),      qtd: (pagarAberto  || []).length },
      contas_receber: { total: sumDiff(receberAberto, 'valor_original', 'valor_recebido'), qtd: (receberAberto || []).length },
      vencidas      : { total: sumDiff(vencidasRows,  'valor_original', 'valor_pago'),      qtd: (vencidasRows  || []).length },
      a_vencer_7dias: (aVencerRows || []).length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// GET /api/dashboard/fluxo-mensal
// ----------------------------------------------------------------
router.get('/fluxo-mensal', async (req, res) => {
  try {
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const dataCorte = seisMesesAtras.toISOString().split('T')[0];

    const { data: rows, error } = await db.from('lancamentos')
      .select('tipo, valor, data_competencia')
      .eq('status', 'PAGO')
      .gte('data_competencia', dataCorte);

    if (error) throw error;

    const meses = {};
    (rows || []).forEach(r => {
      const mes = r.data_competencia.slice(0, 7);
      if (!meses[mes]) meses[mes] = { mes, receitas: 0, despesas: 0 };
      if (r.tipo === 'RECEITA') meses[mes].receitas += Number(r.valor);
      if (r.tipo === 'DESPESA') meses[mes].despesas += Number(r.valor);
    });

    const resultado = Object.values(meses)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map(m => ({ ...m, resultado: m.receitas - m.despesas }));

    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// GET /api/dashboard/distribuicao-despesas
// ----------------------------------------------------------------
router.get('/distribuicao-despesas', async (req, res) => {
  try {
    const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const { data: rows, error } = await db.from('lancamentos')
      .select('valor, descricao, plano_contas!conta_id(nome)')
      .eq('tipo', 'DESPESA').eq('status', 'PAGO')
      .gte('data_competencia', trintaDiasAtras);

    if (error) throw error;

    const agrupado = {};
    (rows || []).forEach(r => {
      const nome = r.plano_contas?.nome || r.descricao.slice(0, 20);
      agrupado[nome] = (agrupado[nome] || 0) + Number(r.valor);
    });

    const resultado = Object.entries(agrupado)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// GET /api/dashboard/ultimos-lancamentos
// ----------------------------------------------------------------
router.get('/ultimos-lancamentos', async (req, res) => {
  try {
    const { data, error } = await db.from('lancamentos')
      .select('*, clientes!cliente_id(nome), fornecedores!fornecedor_id(nome)')
      .order('criado_em', { ascending: false })
      .limit(10);

    if (error) throw error;

    const rows = (data || []).map(r => ({
      ...r,
      cliente_nome    : r.clientes?.nome    || null,
      fornecedor_nome : r.fornecedores?.nome || null,
      clientes        : undefined,
      fornecedores    : undefined,
    }));

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
