const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

router.get('/kpis', (req, res) => {
  const db = getDb();
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = hoje.slice(0, 7) + '-01';

  const receitaMes = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos
    WHERE tipo = 'RECEITA' AND status = 'PAGO'
    AND data_competencia >= ? AND data_competencia <= ?
  `).get(inicioMes, hoje);

  const despesaMes = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total FROM lancamentos
    WHERE tipo = 'DESPESA' AND status = 'PAGO'
    AND data_competencia >= ? AND data_competencia <= ?
  `).get(inicioMes, hoje);

  const contasPagarAbertas = db.prepare(`
    SELECT COALESCE(SUM(valor_original - valor_pago), 0) as total, COUNT(*) as qtd
    FROM contas_pagar WHERE status IN ('ABERTA','PARCIAL')
  `).get();

  const contasReceberAbertas = db.prepare(`
    SELECT COALESCE(SUM(valor_original - valor_recebido), 0) as total, COUNT(*) as qtd
    FROM contas_receber WHERE status IN ('ABERTA','PARCIAL')
  `).get();

  const vencidas = db.prepare(`
    SELECT COALESCE(SUM(valor_original - valor_pago), 0) as total, COUNT(*) as qtd
    FROM contas_pagar WHERE status = 'VENCIDA'
  `).get();

  const aVencer = db.prepare(`
    SELECT COUNT(*) as qtd FROM contas_pagar
    WHERE status = 'ABERTA' AND data_vencimento BETWEEN date('now') AND date('now', '+7 days')
  `).get();

  res.json({
    receita_mes: receitaMes.total,
    despesa_mes: despesaMes.total,
    resultado_mes: receitaMes.total - despesaMes.total,
    contas_pagar: { total: contasPagarAbertas.total, qtd: contasPagarAbertas.qtd },
    contas_receber: { total: contasReceberAbertas.total, qtd: contasReceberAbertas.qtd },
    vencidas: { total: vencidas.total, qtd: vencidas.qtd },
    a_vencer_7dias: aVencer.qtd,
  });
});

router.get('/fluxo-mensal', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', data_competencia) as mes,
      tipo,
      COALESCE(SUM(valor), 0) as total
    FROM lancamentos
    WHERE status = 'PAGO'
    AND data_competencia >= date('now', '-6 months')
    GROUP BY mes, tipo
    ORDER BY mes ASC
  `).all();

  const meses = {};
  rows.forEach(r => {
    if (!meses[r.mes]) meses[r.mes] = { mes: r.mes, receitas: 0, despesas: 0 };
    if (r.tipo === 'RECEITA') meses[r.mes].receitas = r.total;
    if (r.tipo === 'DESPESA') meses[r.mes].despesas = r.total;
  });

  const resultado = Object.values(meses).map(m => ({
    ...m,
    resultado: m.receitas - m.despesas,
  }));

  res.json(resultado);
});

router.get('/distribuicao-despesas', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.nome, COALESCE(SUM(l.valor), 0) as total
    FROM lancamentos l
    JOIN plano_contas p ON l.conta_id = p.id
    WHERE l.tipo = 'DESPESA' AND l.status = 'PAGO'
    AND l.data_competencia >= date('now', '-30 days')
    GROUP BY p.id
    ORDER BY total DESC
    LIMIT 8
  `).all();

  // Fallback se não houver conta vinculada
  if (rows.length === 0) {
    const fallback = db.prepare(`
      SELECT descricao as nome, SUM(valor) as total
      FROM lancamentos
      WHERE tipo = 'DESPESA' AND status = 'PAGO'
      AND data_competencia >= date('now', '-30 days')
      GROUP BY substr(descricao, 1, 20)
      ORDER BY total DESC LIMIT 8
    `).all();
    return res.json(fallback);
  }

  res.json(rows);
});

router.get('/ultimos-lancamentos', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT l.*, c.nome as cliente_nome, f.nome as fornecedor_nome
    FROM lancamentos l
    LEFT JOIN clientes c ON l.cliente_id = c.id
    LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
    ORDER BY l.criado_em DESC
    LIMIT 10
  `).all();
  res.json(rows);
});

module.exports = router;
