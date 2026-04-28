require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb, getDb } = require('./db/schema');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

function runSeed(db) {
  const SQL = db._db;

  const planoContas = [
    ['1','ATIVO','ATIVO','DEVEDORA',1],['1.1','Ativo Circulante','ATIVO','DEVEDORA',2],
    ['1.1.1','Caixa e Equivalentes','ATIVO','DEVEDORA',3],['1.1.2','Contas a Receber','ATIVO','DEVEDORA',3],
    ['2','PASSIVO','PASSIVO','CREDORA',1],['2.1','Passivo Circulante','PASSIVO','CREDORA',2],
    ['2.1.1','Contas a Pagar','PASSIVO','CREDORA',3],
    ['3','RECEITAS','RECEITA','CREDORA',1],['3.1','Receita de Mensalidades','RECEITA','CREDORA',2],
    ['3.2','Receita de Matriculas','RECEITA','CREDORA',2],['3.3','Receita de Cursos','RECEITA','CREDORA',2],
    ['3.4','Outras Receitas','RECEITA','CREDORA',2],
    ['4','DESPESAS','DESPESA','DEVEDORA',1],['4.1','Despesas de Pessoal','DESPESA','DEVEDORA',2],
    ['4.1.1','Salarios e Ordenados','DESPESA','DEVEDORA',3],['4.1.2','Encargos Sociais','DESPESA','DEVEDORA',3],
    ['4.2','Despesas Administrativas','DESPESA','DEVEDORA',2],['4.2.1','Aluguel','DESPESA','DEVEDORA',3],
    ['4.2.2','Energia Eletrica','DESPESA','DEVEDORA',3],['4.2.3','Agua e Esgoto','DESPESA','DEVEDORA',3],
    ['4.2.4','Internet e Telefone','DESPESA','DEVEDORA',3],['4.2.5','Material de Escritorio','DESPESA','DEVEDORA',3],
    ['4.3','Despesas Financeiras','DESPESA','DEVEDORA',2],['4.3.1','Juros e Encargos','DESPESA','DEVEDORA',3],
    ['4.3.2','Tarifas Bancarias','DESPESA','DEVEDORA',3],['4.4','Despesas com Marketing','DESPESA','DEVEDORA',2],
    ['4.5','Despesas com TI','DESPESA','DEVEDORA',2],
  ];

  const stmtPC = SQL.prepare('INSERT OR IGNORE INTO plano_contas (id,codigo,nome,tipo,natureza,nivel) VALUES (?,?,?,?,?,?)');
  planoContas.forEach(([cod,nome,tipo,nat,nivel]) => stmtPC.run([uuidv4(),cod,nome,tipo,nat,nivel]));
  stmtPC.free();

  // Clientes
  const stmtCli = SQL.prepare('INSERT OR IGNORE INTO clientes (id,tipo,nome,cpf_cnpj,email,telefone,cidade,uf) VALUES (?,?,?,?,?,?,?,?)');
  [
    [uuidv4(),'PF','Joao Silva','123.456.789-00','joao@email.com','84 99999-0001','Pau dos Ferros','RN'],
    [uuidv4(),'PF','Maria Souza','987.654.321-00','maria@email.com','84 99999-0002','Pau dos Ferros','RN'],
    [uuidv4(),'PJ','Escola Estadual Pedro II','12.345.678/0001-00','contato@pedroii.edu.br','84 3300-0001','Mossoro','RN'],
  ].forEach(r => stmtCli.run(r));
  stmtCli.free();

  // Fornecedores
  const stmtForn = SQL.prepare('INSERT OR IGNORE INTO fornecedores (id,tipo,nome,cpf_cnpj,email,telefone,cidade,uf,categoria) VALUES (?,?,?,?,?,?,?,?,?)');
  [
    [uuidv4(),'PJ','Papelaria Central','11.222.333/0001-44','vendas@papelaria.com','84 3351-0001','Pau dos Ferros','RN','Material de Escritorio'],
    [uuidv4(),'PJ','Energisa RN','08.324.196/0001-81','energisa@rn.com','0800','Natal','RN','Concessionaria'],
    [uuidv4(),'PJ','Claro SA','40.432.544/0001-47','empresas@claro.com.br','1052','Sao Paulo','SP','Telecomunicacoes'],
  ].forEach(r => stmtForn.run(r));
  stmtForn.free();

  // Busca IDs
  const fornRows = SQL.exec('SELECT id FROM fornecedores LIMIT 1');
  const cliRows = SQL.exec('SELECT id FROM clientes LIMIT 1');
  const fornId = fornRows[0] ? fornRows[0].values[0][0] : null;
  const cliId = cliRows[0] ? cliRows[0].values[0][0] : null;

  const hoje = new Date();
  const receitas = [['Mensalidades',45800],['Matriculas',12500],['Curso ENEM',8200],['Apostilas',3100],['Taxa Vestibular',6200]];
  const despesas = [['Folha de Pagamento',28000],['Aluguel',6500],['Energia Eletrica',1800],['Internet e Telefone',900],['Material Didatico',3200],['Encargos Sociais',8400]];

  const stmtL = SQL.prepare('INSERT OR IGNORE INTO lancamentos (id,descricao,tipo,valor,data_competencia,data_pagamento,status) VALUES (?,?,?,?,?,?,?)');
  const stmtCP = SQL.prepare('INSERT OR IGNORE INTO contas_pagar (id,fornecedor_id,descricao,valor_original,valor_pago,data_emissao,data_vencimento,data_pagamento,status) VALUES (?,?,?,?,?,?,?,?,?)');
  const stmtCR = SQL.prepare('INSERT OR IGNORE INTO contas_receber (id,cliente_id,descricao,valor_original,valor_recebido,data_emissao,data_vencimento,data_recebimento,status) VALUES (?,?,?,?,?,?,?,?,?)');

  for (let m = 5; m >= 0; m--) {
    const d = new Date(hoje); d.setMonth(d.getMonth() - m);
    const ds = d.toISOString().split('T')[0];
    const mes = ds.slice(0, 7);
    receitas.forEach(([desc, base]) => {
      const val = base + Math.floor(Math.random() * 2000 - 1000);
      stmtL.run([uuidv4(), `${desc} ${mes}`, 'RECEITA', val, ds, ds, 'PAGO']);
      if (cliId) stmtCR.run([uuidv4(), cliId, desc, val, val, ds, ds, ds, 'RECEBIDA']);
    });
    despesas.forEach(([desc, base]) => {
      const val = base + Math.floor(Math.random() * 500 - 250);
      stmtL.run([uuidv4(), `${desc} ${mes}`, 'DESPESA', val, ds, ds, 'PAGO']);
      if (fornId) stmtCP.run([uuidv4(), fornId, desc, val, val, ds, ds, ds, 'PAGA']);
    });
  }

  // Contas abertas e vencidas
  const futStr = new Date(hoje.getTime() + 15 * 864e5).toISOString().split('T')[0];
  const vencStr = new Date(hoje.getTime() - 5 * 864e5).toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];
  if (fornId) {
    stmtCP.run([uuidv4(), fornId, 'Aluguel (vence em breve)', 6500, 0, hojeStr, futStr, null, 'ABERTA']);
    stmtCP.run([uuidv4(), fornId, 'Folha de Pagamento (pendente)', 28000, 0, hojeStr, futStr, null, 'ABERTA']);
    stmtCP.run([uuidv4(), fornId, 'Material Didatico (VENCIDO)', 3200, 0, hojeStr, vencStr, null, 'VENCIDA']);
  }

  stmtL.free(); stmtCP.free(); stmtCR.free();

  // Centros de custo
  const stmtCC = SQL.prepare('INSERT OR IGNORE INTO centros_custo (id,codigo,nome,descricao) VALUES (?,?,?,?)');
  [['ADM','Administrativo','Departamento Administrativo'],['PED','Pedagogico','Departamento Pedagogico'],['COM','Comercial','Departamento Comercial']].forEach(([c,n,d]) => stmtCC.run([uuidv4(),c,n,d]));
  stmtCC.free();

  db._save();
  console.log('Seed concluido com sucesso!');
}

initDb().then(() => {
  console.log('Banco de dados inicializado');

  const db = getDb();
  const SQL = db._db;

  // Verifica se precisa seed (direto no sql.js, sem shim)
  const countRows = SQL.exec('SELECT COUNT(*) as n FROM lancamentos');
  const n = countRows[0] ? Number(countRows[0].values[0][0]) : 0;

  if (n === 0) {
    console.log('Executando seed inicial...');
    try { runSeed(db); } catch (e) { console.error('Erro no seed:', e.message); }
  } else {
    console.log(`Banco com ${n} lancamentos. Seed ignorado.`);
  }

  // Rotas
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api', require('./routes/entidades'));
  app.use('/api/financeiro', require('./routes/financeiro'));
  app.use('/api/admin', require('./routes/admin'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', lancamentos: n }));

  const distIndex = path.join(__dirname, '../../client/dist/index.html');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    if (fs.existsSync(distIndex)) res.sendFile(distIndex);
    else res.send('Dev mode: acesse http://localhost:5173');
  });

  app.listen(PORT, () => console.log(`FluxD pronto em http://localhost:${PORT}`));
}).catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
