const { getDb } = require('./schema');
const { v4: uuidv4 } = require('uuid');

function seed() {
  const db = getDb();
  // Plano de contas padrão
  const planoContas = [
    { codigo: '1', nome: 'ATIVO', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 1 },
    { codigo: '1.1', nome: 'Ativo Circulante', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2 },
    { codigo: '1.1.1', nome: 'Caixa e Equivalentes', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '1.1.2', nome: 'Contas a Receber', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '2', nome: 'PASSIVO', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 1 },
    { codigo: '2.1', nome: 'Passivo Circulante', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 2 },
    { codigo: '2.1.1', nome: 'Contas a Pagar', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3 },
    { codigo: '3', nome: 'RECEITAS', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 1 },
    { codigo: '3.1', nome: 'Receita de Mensalidades', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2 },
    { codigo: '3.2', nome: 'Receita de Matrículas', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2 },
    { codigo: '3.3', nome: 'Receita de Cursos', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2 },
    { codigo: '3.4', nome: 'Outras Receitas', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2 },
    { codigo: '4', nome: 'DESPESAS', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 1 },
    { codigo: '4.1', nome: 'Despesas de Pessoal', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2 },
    { codigo: '4.1.1', nome: 'Salários e Ordenados', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.1.2', nome: 'Encargos Sociais', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.2', nome: 'Despesas Administrativas', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2 },
    { codigo: '4.2.1', nome: 'Aluguel e Condomínio', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.2.2', nome: 'Energia Elétrica', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.2.3', nome: 'Água e Esgoto', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.2.4', nome: 'Internet e Telefone', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.2.5', nome: 'Material de Escritório', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.3', nome: 'Despesas Financeiras', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2 },
    { codigo: '4.3.1', nome: 'Juros e Encargos', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.3.2', nome: 'Tarifas Bancárias', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3 },
    { codigo: '4.4', nome: 'Despesas com Marketing', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2 },
    { codigo: '4.5', nome: 'Despesas com TI', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2 },
  ];

  const insertConta = db.prepare(`
    INSERT OR IGNORE INTO plano_contas (id, codigo, nome, tipo, natureza, nivel)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((contas) => {
    for (const c of contas) {
      insertConta.run(uuidv4(), c.codigo, c.nome, c.tipo, c.natureza, c.nivel);
    }
  });
  insertMany(planoContas);

  // Centros de custo
  const centros = [
    { codigo: 'ADM', nome: 'Administrativo', descricao: 'Departamento Administrativo' },
    { codigo: 'PED', nome: 'Pedagógico', descricao: 'Departamento Pedagógico' },
    { codigo: 'COM', nome: 'Comercial', descricao: 'Departamento Comercial' },
    { codigo: 'FIN', nome: 'Financeiro', descricao: 'Departamento Financeiro' },
    { codigo: 'TI', nome: 'Tecnologia', descricao: 'TI e Sistemas' },
  ];

  const insertCentro = db.prepare(`
    INSERT OR IGNORE INTO centros_custo (id, codigo, nome, descricao)
    VALUES (?, ?, ?, ?)
  `);
  db.transaction((cs) => cs.forEach(c => insertCentro.run(uuidv4(), c.codigo, c.nome, c.descricao)))(centros);

  // Dados demo - clientes
  const clientes = [
    { nome: 'João Silva', tipo: 'PF', cpf_cnpj: '123.456.789-00', email: 'joao@email.com', telefone: '84 99999-0001', cidade: 'Pau dos Ferros', uf: 'RN' },
    { nome: 'Maria Souza', tipo: 'PF', cpf_cnpj: '987.654.321-00', email: 'maria@email.com', telefone: '84 99999-0002', cidade: 'Pau dos Ferros', uf: 'RN' },
    { nome: 'Escola Estadual Pedro II', tipo: 'PJ', cpf_cnpj: '12.345.678/0001-00', razao_social: 'Escola Estadual Pedro II', email: 'contato@pedroii.edu.br', cidade: 'Mossoró', uf: 'RN' },
  ];

  const insertCliente = db.prepare(`
    INSERT OR IGNORE INTO clientes (id, tipo, nome, razao_social, cpf_cnpj, email, telefone, cidade, uf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction((cs) => cs.forEach(c => insertCliente.run(uuidv4(), c.tipo, c.nome, c.razao_social || null, c.cpf_cnpj, c.email, c.telefone, c.cidade, c.uf)))(clientes);

  // Dados demo - fornecedores
  const fornecedores = [
    { nome: 'Papelaria Central', tipo: 'PJ', cpf_cnpj: '11.222.333/0001-44', email: 'vendas@papelariacentral.com', telefone: '84 3351-0001', cidade: 'Pau dos Ferros', uf: 'RN', categoria: 'Material de Escritório' },
    { nome: 'Energisa RN', tipo: 'PJ', cpf_cnpj: '08.324.196/0001-81', email: 'atendimento@energisa.com.br', cidade: 'Natal', uf: 'RN', categoria: 'Concessionária' },
    { nome: 'Claro S/A', tipo: 'PJ', cpf_cnpj: '40.432.544/0001-47', email: 'empresas@claro.com.br', cidade: 'São Paulo', uf: 'SP', categoria: 'Telecomunicações' },
  ];

  const insertFornecedor = db.prepare(`
    INSERT OR IGNORE INTO fornecedores (id, tipo, nome, cpf_cnpj, email, telefone, cidade, uf, categoria)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction((fs) => fs.forEach(f => insertFornecedor.run(uuidv4(), f.tipo, f.nome, f.cpf_cnpj, f.email, f.telefone || null, f.cidade, f.uf, f.categoria || null)))(fornecedores);

  // Lançamentos de exemplo dos últimos 6 meses
  const hoje = new Date();
  const lancamentosDemo = [];
  const receitas = [
    { desc: 'Mensalidades Março', tipo: 'RECEITA', valor: 45800 },
    { desc: 'Matrículas 2025', tipo: 'RECEITA', valor: 12500 },
    { desc: 'Curso Preparatório ENEM', tipo: 'RECEITA', valor: 8200 },
    { desc: 'Mensalidades Fevereiro', tipo: 'RECEITA', valor: 43200 },
    { desc: 'Mensalidades Janeiro', tipo: 'RECEITA', valor: 41500 },
  ];
  const despesas = [
    { desc: 'Folha de Pagamento', tipo: 'DESPESA', valor: 28000 },
    { desc: 'Aluguel', tipo: 'DESPESA', valor: 6500 },
    { desc: 'Energia Elétrica', tipo: 'DESPESA', valor: 1800 },
    { desc: 'Internet e Telefone', tipo: 'DESPESA', valor: 900 },
    { desc: 'Material Didático', tipo: 'DESPESA', valor: 3200 },
    { desc: 'Encargos Sociais', tipo: 'DESPESA', valor: 8400 },
  ];

  const insertLanc = db.prepare(`
    INSERT OR IGNORE INTO lancamentos (id, descricao, tipo, valor, data_competencia, data_pagamento, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertContaPagar = db.prepare(`
    INSERT OR IGNORE INTO contas_pagar (id, fornecedor_id, descricao, valor_original, valor_pago, data_emissao, data_vencimento, data_pagamento, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertContaReceber = db.prepare(`
    INSERT OR IGNORE INTO contas_receber (id, cliente_id, descricao, valor_original, valor_recebido, data_emissao, data_vencimento, data_recebimento, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Busca IDs dos primeiros registros inseridos
  const primeiroFornecedor = db.prepare('SELECT id FROM fornecedores LIMIT 1').get();
  const primeiroCliente = db.prepare('SELECT id FROM clientes LIMIT 1').get();
  const fornId = primeiroFornecedor ? primeiroFornecedor.id : null;
  const cliId = primeiroCliente ? primeiroCliente.id : null;

  for (let m = 5; m >= 0; m--) {
    const d = new Date(hoje);
    d.setMonth(d.getMonth() - m);
    const dataStr = d.toISOString().split('T')[0];
    const mesLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    for (const r of receitas) {
      const val = r.valor + Math.floor(Math.random() * 2000 - 1000);
      insertLanc.run(uuidv4(), `${r.desc} - ${mesLabel}`, r.tipo, val, dataStr, dataStr, 'PAGO');
      if (cliId) insertContaReceber.run(uuidv4(), cliId, r.desc, val, val, dataStr, dataStr, dataStr, 'RECEBIDA');
    }

    for (const d2 of despesas) {
      const val = d2.valor + Math.floor(Math.random() * 500 - 250);
      insertLanc.run(uuidv4(), `${d2.desc} - ${mesLabel}`, d2.tipo, val, dataStr, dataStr, 'PAGO');
      if (fornId) insertContaPagar.run(uuidv4(), fornId, d2.desc, val, val, dataStr, dataStr, dataStr, 'PAGA');
    }
  }

  // Contas abertas (pendentes)
  const futuro = new Date(hoje);
  futuro.setDate(futuro.getDate() + 15);
  const futStr = futuro.toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];

  if (fornId) {
    insertContaPagar.run(uuidv4(), fornId, 'Aluguel ' + new Date().toLocaleDateString('pt-BR',{month:'long'}), 6500, 0, hojeStr, futStr, null, 'ABERTA');
    insertContaPagar.run(uuidv4(), fornId, 'Folha de Pagamento ' + new Date().toLocaleDateString('pt-BR',{month:'long'}), 28000, 0, hojeStr, futStr, null, 'ABERTA');
    const vencido = new Date(hoje);
    vencido.setDate(vencido.getDate() - 5);
    insertContaPagar.run(uuidv4(), fornId, 'Material Didático', 3200, 0, hojeStr, vencido.toISOString().split('T')[0], null, 'VENCIDA');
  }

  // Atualizar status de vencidas
  db.exec(`
    UPDATE contas_pagar SET status = 'VENCIDA'
    WHERE status = 'ABERTA' AND data_vencimento < date('now') AND data_pagamento IS NULL;

    UPDATE contas_receber SET status = 'VENCIDA'
    WHERE status = 'ABERTA' AND data_vencimento < date('now') AND data_recebimento IS NULL;
  `);

  console.log('✅ Seed executado com sucesso!');
}

try {
  seed();
} catch (e) {
  console.error('Erro no seed:', e.message);
}
