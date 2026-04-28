// Corrige nomes de plano_contas com encoding quebrado (caracteres especiais virou '?')
const path = require('path');
const fs = require('fs');

async function fix() {
  const initSqlJs = require('sql.js');
  const DB_PATH = path.join(__dirname, 'unicri.db');

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  const fixes = [
    // Passivo Circulante — Obrigações Fiscais
    ['2.1.2',   'Obrigações Fiscais e Tributárias CP'],
    ['2.1.2.2', 'Dívida Ativa da União — CP'],
    ['2.1.2.3', 'Parcelamentos Fiscais CP'],
    ['2.1.2.4', 'Simples Nacional a Recolher'],
    // Empréstimos CP
    ['2.1.3',   'Empréstimos e Financiamentos CP'],
    ['2.1.3.1', 'Empréstimos Bancários CP'],
    ['2.1.3.2', 'Outras Obrigações Financeiras CP'],
    // Obrigações Trabalhistas CP
    ['2.1.4',   'Obrigações Trabalhistas e Prev. CP'],
    ['2.1.4.1', 'Salários e Férias a Pagar'],
    ['2.1.4.2', 'FGTS a Recolher'],
    ['2.1.4.3', 'INSS a Recolher'],
    // Passivo Não Circulante
    ['2.2',     'Passivo Não Circulante'],
    ['2.2.1',   'Dívidas Fiscais de Longo Prazo'],
    ['2.2.1.1', 'Dívida Ativa da União — Saldo LP'],
    ['2.2.1.2', 'PERT — Saldo Longo Prazo'],
    ['2.2.1.3', 'REFIS — Saldo Longo Prazo'],
    ['2.2.1.4', 'Parcelamento PGFN — Saldo LP'],
    ['2.2.1.5', 'Parcelamento Simples Nacional — LP'],
    ['2.2.2',   'Empréstimos e Financiamentos LP'],
    ['2.2.2.1', 'Empréstimos Bancários LP'],
    ['2.2.2.2', 'Outras Obrigações Financeiras LP'],
    ['2.2.3',   'Provisões para Contingências'],
    ['2.2.3.1', 'Provisão Trabalhista'],
    ['2.2.3.2', 'Provisão Fiscal Contingente'],
    // Patrimônio Líquido
    ['5',       'PATRIMÔNIO LÍQUIDO'],
    ['5.1',     'Capital Social'],
    ['5.2',     'Reservas de Capital'],
    ['5.3',     'Reservas de Lucros'],
    ['5.4',     'Prejuízos Acumulados'],
    ['5.5',     'Resultado do Exercício'],
  ];

  const stmt = db.prepare('UPDATE plano_contas SET nome = ? WHERE codigo = ?');
  let count = 0;
  for (const [codigo, nome] of fixes) {
    stmt.run([nome, codigo]);
    count++;
  }
  stmt.free();

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`Corrigidos ${count} registros. Banco salvo em ${DB_PATH}`);
}

fix().catch(e => { console.error(e); process.exit(1); });
