import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Paleta de cores (brand FluxD) ────────────────────────────────
const NAVY  = [30,  58,  95];
const TEAL  = [26,  141, 181];
const GREEN = [16,  185, 129];
const RED   = [220, 38,  38];
const WHITE = [255, 255, 255];
const GRAY  = [107, 114, 128];
const LGRAY = [248, 250, 252];

// ── Helpers ──────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(v || 0);
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function pctStr(val, total) {
  if (!total) return '—';
  return ((val / total) * 100).toFixed(1).replace('.', ',') + '%';
}

// ── Exportação principal ─────────────────────────────────────────
export function exportarDREpdf(dre, periodo, empresa, analitico = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;   // largura total
  const PH = 297;   // altura total
  const ML = 14;    // margem esquerda
  const MR = 14;    // margem direita
  const CW = PW - ML - MR;  // 182mm utilizáveis

  const dtInicio    = fmtDate(periodo.inicio);
  const dtFim       = fmtDate(periodo.fim);
  const nomeEmpresa = empresa?.nome || 'Empresa';
  const agora       = new Date().toLocaleString('pt-BR');

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  CABEÇALHO                                                  ║
  // ╚══════════════════════════════════════════════════════════════╝
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 40, 'F');

  // Faixa teal inferior
  doc.setFillColor(...TEAL);
  doc.rect(0, 37.5, PW, 2.5, 'F');

  // Barra vertical esquerda
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 4.5, 40, 'F');

  // Nome da empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(nomeEmpresa.toUpperCase(), ML + 5, 14);

  // Título
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 210, 235);
  doc.text('DRE — DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO', ML + 5, 22);

  // Período
  doc.setFontSize(7.5);
  doc.setTextColor(140, 175, 205);
  doc.text(`Período: ${dtInicio} a ${dtFim}`, ML + 5, 30);

  // Branding FluxD (direita)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('FluxD', PW - MR, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 175, 215);
  doc.text('Sistema de Gestão Financeira', PW - MR, 23, { align: 'right' });

  doc.setFontSize(6.5);
  doc.setTextColor(100, 150, 180);
  doc.text(`Emitido em ${agora}`, PW - MR, 30, { align: 'right' });

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  KPI CARDS                                                  ║
  // ╚══════════════════════════════════════════════════════════════╝
  const kpis = [
    {
      label: 'RECEITA TOTAL',
      value: dre.total_receitas,
      color: GREEN,
      bg: [236, 253, 245],
    },
    {
      label: 'DESPESAS TOTAIS',
      value: dre.total_despesas,
      color: RED,
      bg: [254, 242, 242],
    },
    {
      label: 'RESULTADO LÍQUIDO',
      value: dre.resultado,
      color: dre.resultado >= 0 ? TEAL : RED,
      bg:    dre.resultado >= 0 ? [236, 248, 254] : [254, 242, 242],
    },
  ];

  const BOX_W   = 57;
  const BOX_H   = 23;
  const BOX_Y   = 47;
  const BOX_GAP = (CW - 3 * BOX_W) / 2;

  kpis.forEach((kpi, i) => {
    const x = ML + i * (BOX_W + BOX_GAP);

    doc.setFillColor(...kpi.bg);
    doc.roundedRect(x, BOX_Y, BOX_W, BOX_H, 2, 2, 'F');

    // Borda esquerda colorida
    doc.setFillColor(...kpi.color);
    doc.roundedRect(x, BOX_Y, 3.5, BOX_H, 1, 1, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(kpi.label, x + 7, BOX_Y + 8);

    // Valor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...kpi.color);
    doc.text(fmt(kpi.value), x + 7, BOX_Y + 18.5);
  });

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  TABELA DRE                                                 ║
  // ╚══════════════════════════════════════════════════════════════╝
  const TABLE_Y = BOX_Y + BOX_H + 12;

  // Título da seção
  doc.setFillColor(...TEAL);
  doc.rect(ML, TABLE_Y - 6, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('ESTRUTURA DO RESULTADO', ML + 5.5, TABLE_Y - 0.5);

  // Montar linhas
  const rows = [];

  rows.push({
    desc: 'RECEITA BRUTA',
    valor: dre.total_receitas,
    pct: '100,0%',
    level: 'group',
    tipo: 'receita',
  });
  (dre.receitas || []).forEach(r => rows.push({
    desc: r.nome,
    valor: r.total,
    pct: pctStr(r.total, dre.total_receitas),
    level: 'detail',
    tipo: 'receita',
  }));

  rows.push({
    desc: 'DESPESAS OPERACIONAIS',
    valor: dre.total_despesas,
    pct: pctStr(dre.total_despesas, dre.total_receitas),
    level: 'group',
    tipo: 'despesa',
  });
  (dre.despesas || []).forEach(d => rows.push({
    desc: d.nome,
    valor: d.total,
    pct: pctStr(d.total, dre.total_receitas),
    level: 'detail',
    tipo: 'despesa',
  }));

  const margemFmt =
    parseFloat(dre.margem || 0).toFixed(1).replace('.', ',') + '%';
  rows.push({
    desc: 'RESULTADO LÍQUIDO DO EXERCÍCIO',
    valor: dre.resultado,
    pct: margemFmt,
    level: 'result',
    tipo: dre.resultado >= 0 ? 'pos' : 'neg',
  });

  autoTable(doc, {
    startY: TABLE_Y + 2,
    margin: { left: ML, right: MR },
    head: [[
      { content: 'DESCRIÇÃO',  styles: { halign: 'left'  } },
      { content: 'VALOR (R$)', styles: { halign: 'right' } },
      { content: '% RECEITA',  styles: { halign: 'right' } },
    ]],
    body: rows.map(r => [
      r.level === 'detail' ? `       ${r.desc}` : r.desc,
      fmt(r.valor),
      r.pct,
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      lineColor: [220, 228, 238],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
    },
    columnStyles: {
      0: { cellWidth: 118 },
      1: { cellWidth: 38, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      if (!row) return;

      if (row.level === 'result') {
        data.cell.styles.fillColor   = NAVY;
        data.cell.styles.textColor   = WHITE;
        data.cell.styles.fontStyle   = 'bold';
        data.cell.styles.fontSize    = 9.5;
        data.cell.styles.cellPadding = { top: 5, bottom: 5, left: 5, right: 5 };
      } else if (row.level === 'group') {
        data.cell.styles.fillColor = [237, 243, 250];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = NAVY;
        if (data.column.index === 1)
          data.cell.styles.textColor = row.tipo === 'receita' ? GREEN : RED;
      } else {
        // detail
        data.cell.styles.textColor = [80, 92, 108];
        data.cell.styles.fontSize  = 8;
        if (data.column.index === 1)
          data.cell.styles.textColor = row.tipo === 'receita' ? [22, 163, 74] : [185, 28, 28];
        if (data.column.index === 2) {
          data.cell.styles.textColor = [130, 142, 158];
          data.cell.styles.fontSize  = 7.5;
        }
      }
    },
  });

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  SEÇÃO DE ANÁLISE (margem + gráfico)                        ║
  // ╚══════════════════════════════════════════════════════════════╝
  let y = (doc.lastAutoTable?.finalY ?? 185) + 14;
  if (y > 238) { doc.addPage(); y = 20; }

  const HALF_W = Math.floor((CW - 8) / 2);
  const margem = parseFloat(dre.margem || 0);

  // Título da seção
  doc.setFillColor(...TEAL);
  doc.rect(ML, y - 6, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('INDICADORES DE DESEMPENHO', ML + 5.5, y - 0.5);

  y += 3;
  const IND_H = 34;

  // ── Box Margem (esquerda) ──────────────────────────────────────
  const margemColor = margem >= 20 ? GREEN : margem >= 0 ? TEAL : RED;

  doc.setFillColor(...LGRAY);
  doc.roundedRect(ML, y, HALF_W, IND_H, 2, 2, 'F');

  doc.setFillColor(...margemColor);
  doc.roundedRect(ML, y, 3.5, IND_H, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text('MARGEM LÍQUIDA', ML + 7, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(...margemColor);
  doc.text(`${margem.toFixed(1)}%`, ML + 7, y + 22);

  // Barra de progresso
  const BAR_X = ML + 7;
  const BAR_W = HALF_W - 14;
  const BAR_Y = y + 26;

  doc.setFillColor(210, 220, 232);
  doc.roundedRect(BAR_X, BAR_Y, BAR_W, 3, 1.5, 1.5, 'F');
  if (margem > 0) {
    doc.setFillColor(...margemColor);
    doc.roundedRect(
      BAR_X, BAR_Y,
      (Math.min(margem, 100) / 100) * BAR_W, 3,
      1.5, 1.5, 'F',
    );
  }

  const statusTxt = margem >= 20
    ? '● Margem saudável (acima de 20%)'
    : margem >= 0
      ? '◐ Margem baixa (abaixo de 20%)'
      : '● Resultado negativo';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...margemColor);
  doc.text(statusTxt, BAR_X, BAR_Y + 8);

  // ── Gráfico de barras (direita) ────────────────────────────────
  const chartX = ML + HALF_W + 8;
  const chartW = HALF_W;
  const CHART_H = 25;

  // Título
  doc.setFillColor(...TEAL);
  doc.rect(chartX, y - 0.5 - 6, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('COMPARATIVO VISUAL', chartX + 5.5, y - 0.5);

  // Fundo
  doc.setFillColor(...LGRAY);
  doc.roundedRect(chartX, y, chartW, IND_H, 2, 2, 'F');

  const barData = [
    { label: 'Receitas',   value: dre.total_receitas,            color: GREEN },
    { label: 'Despesas',   value: dre.total_despesas,            color: RED   },
    { label: 'Resultado',  value: Math.abs(dre.resultado || 0),  color: dre.resultado >= 0 ? TEAL : RED },
  ];

  const maxVal   = Math.max(...barData.map(b => b.value), 1);
  const BAR_COL  = 14;
  const barsBase = y + 4 + CHART_H;
  const gapBars  = (chartW - barData.length * BAR_COL - 16) / (barData.length - 1);

  barData.forEach((bar, i) => {
    const bh = Math.max((bar.value / maxVal) * CHART_H, 1.5);
    const bx = chartX + 8 + i * (BAR_COL + gapBars);
    const by = barsBase - bh;

    doc.setFillColor(...bar.color);
    doc.roundedRect(bx, by, BAR_COL, bh, 1.5, 1.5, 'F');

    // Valor acima
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...bar.color);
    const shortVal = bar.value >= 1000
      ? `${(bar.value / 1000).toFixed(0)}k`
      : fmt(bar.value);
    doc.text(shortVal, bx + BAR_COL / 2, by - 1.5, { align: 'center' });

    // Label abaixo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text(bar.label, bx + BAR_COL / 2, barsBase + 5, { align: 'center' });
  });

  // Linha de base do gráfico
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.25);
  doc.line(chartX + 6, barsBase, chartX + chartW - 6, barsBase);

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  RODAPÉ                                                     ║
  // ╚══════════════════════════════════════════════════════════════╝
  const FY = PH - 10;

  doc.setFillColor(...TEAL);
  doc.rect(0, FY - 4.5, PW, 0.7, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text(`Gerado em ${agora}`, ML, FY + 1);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('FluxD ERP — Sistema de Gestão Financeira', PW / 2, FY + 1, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Página 1', PW - MR, FY + 1, { align: 'right' });

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  PÁGINAS ANALÍTICAS (uma por categoria)                     ║
  // ╚══════════════════════════════════════════════════════════════╝
  if (analitico?.categorias?.length > 0) {
    analitico.categorias.forEach((cat, catIdx) => {
      doc.addPage();

      // Cabeçalho da página analítica
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, PW, 28, 'F');
      doc.setFillColor(...TEAL);
      doc.rect(0, 25.5, PW, 2.5, 'F');
      doc.setFillColor(...TEAL);
      doc.rect(0, 0, 4.5, 28, 'F');

      // Tipo badge
      const isTipoReceita = cat.tipo === 'RECEITA';
      doc.setFillColor(...(isTipoReceita ? GREEN : RED));
      doc.roundedRect(ML + 5, 5, 22, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...WHITE);
      doc.text(cat.tipo, ML + 16, 10, { align: 'center' });

      // Nome da categoria
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text(cat.nome.toUpperCase(), ML + 5, 20);

      // Total da categoria (direita)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...(isTipoReceita ? GREEN : RED));
      doc.text(fmt(cat.total), PW - MR, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 175, 205);
      doc.text(`${pctStr(cat.total, isTipoReceita ? analitico.total_receitas : analitico.total_despesas)} do total de ${cat.tipo === 'RECEITA' ? 'receitas' : 'despesas'}`, PW - MR, 21, { align: 'right' });

      // Período
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(140, 175, 205);
      doc.text(`Período: ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}`, ML + 5, 26.5);

      // Branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 150, 180);
      doc.text('FluxD', PW - MR, 8, { align: 'right' });

      // Tabela de lançamentos
      const lancRows = cat.lancamentos.map(l => [
        fmtDate(l.data),
        l.descricao,
        l.cliente || l.fornecedor || '—',
        l.numero_documento || '—',
        fmt(l.valor),
      ]);

      // Subtotal
      lancRows.push([
        { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
        { content: fmt(cat.total), styles: { halign: 'right', fontStyle: 'bold', fillColor: NAVY, textColor: WHITE } },
      ]);

      autoTable(doc, {
        startY: 35,
        margin: { left: ML, right: MR },
        head: [[
          { content: 'DATA',       styles: { halign: 'left'  } },
          { content: 'DESCRIÇÃO',  styles: { halign: 'left'  } },
          { content: 'CLIENTE/FORNECEDOR', styles: { halign: 'left' } },
          { content: 'Nº DOC',     styles: { halign: 'left'  } },
          { content: 'VALOR (R$)', styles: { halign: 'right' } },
        ]],
        body: lancRows,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          lineColor: [220, 228, 238],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: NAVY,
          textColor: WHITE,
          fontSize: 7,
          fontStyle: 'bold',
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 72 },
          2: { cellWidth: 42 },
          3: { cellWidth: 16 },
          4: { cellWidth: 30, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [252, 253, 255] },
        didParseCell(data) {
          if (data.section !== 'body') return;
          const isLast = data.row.index === lancRows.length - 1;
          if (!isLast && data.column.index === 4) {
            data.cell.styles.textColor = isTipoReceita ? [22, 163, 74] : [185, 28, 28];
          }
        },
      });

      // Rodapé da página analítica
      const pageNum = doc.getNumberOfPages();
      doc.setFillColor(...TEAL);
      doc.rect(0, PH - 10 - 4.5, PW, 0.7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(`Gerado em ${agora}`, ML, PH - 10 + 1);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text('FluxD ERP — Sistema de Gestão Financeira', PW / 2, PH - 10 + 1, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(`Página ${pageNum}`, PW - MR, PH - 10 + 1, { align: 'right' });
    });
  }

  // ── Salvar ────────────────────────────────────────────────────
  const filename = `DRE_${periodo.inicio}_${periodo.fim}.pdf`;
  doc.save(filename);
}
