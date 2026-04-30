/**
 * seed-demo.js — Popula o Supabase com dados fictícios para ambiente de teste
 *
 * Uso (PowerShell):
 *   cd server
 *   $env:SEED_EMPRESA_ID="<uuid>"; node -r dotenv/config seed-demo.js
 *
 * Se quiser criar uma empresa nova automaticamente, omita SEED_EMPRESA_ID.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMPRESA_ID = process.env.SEED_EMPRESA_ID || null;

function rnd(a, b) { return Math.round((a + Math.random() * (b - a)) * 100) / 100; }
function diasAtras(n)  { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function diasFrente(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
function diaNoMes(m, dia) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  d.setDate(dia);
  return d.toISOString().split('T')[0];
}

async function run() {
  console.log('Iniciando seed demo...\n');

  // ── 1. Empresa ───────────────────────────────────────────────
  let eid = EMPRESA_ID;
  if (!eid) {
    const { data: emp, error } = await db.from('empresas').insert({
      nome         : 'FluxD Demo Ltda',
      razao_social : 'FluxD Tecnologia Ltda',
      cnpj         : '12.345.678/0001-99',
      email        : 'fin@fluxddemo.com.br',
      telefone     : '(11) 3000-0001',
      endereco     : 'Av. Paulista, 1000 - Sao Paulo/SP',
      plano        : 'PRO',
    }).select().single();
    if (error) { console.error('Erro empresa:', error.message); process.exit(1); }
    eid = emp.id;
    console.log('Empresa criada:', emp.nome, '\nID:', eid);
  } else {
    console.log('Usando empresa:', eid);
  }

  // ── 2. Clientes ──────────────────────────────────────────────
  const cliSeed = [
    { nome: 'Construtora Horizonte SA',  tipo: 'PJ', cpf_cnpj: '11.222.333/0001-44', email: 'fin@horizonte.com.br',    telefone: '(11) 3100-2000', cidade: 'Sao Paulo',      uf: 'SP', empresa_id: eid, ativo: true },
    { nome: 'Supermercados Bom Preco',   tipo: 'PJ', cpf_cnpj: '22.333.444/0001-55', email: 'cmp@bompreco.com.br',     telefone: '(21) 2200-3000', cidade: 'Rio de Janeiro', uf: 'RJ', empresa_id: eid, ativo: true },
    { nome: 'Clinica Saude Total',       tipo: 'PJ', cpf_cnpj: '33.444.555/0001-66', email: 'adm@saudetotal.med.br',  telefone: '(31) 3300-4000', cidade: 'Belo Horizonte', uf: 'MG', empresa_id: eid, ativo: true },
    { nome: 'Ana Paula Ferreira',        tipo: 'PF', cpf_cnpj: '123.456.789-01',      email: 'ana@gmail.com',           telefone: '(11) 99001-0001', cidade: 'Sao Paulo',     uf: 'SP', empresa_id: eid, ativo: true },
    { nome: 'Roberto Mendes',            tipo: 'PF', cpf_cnpj: '987.654.321-09',      email: 'roberto@adv.br',          telefone: '(11) 99002-0002', cidade: 'Campinas',      uf: 'SP', empresa_id: eid, ativo: true },
    { nome: 'Escola Tecnica Progresso',  tipo: 'PJ', cpf_cnpj: '44.555.666/0001-77', email: 'dir@etprogresso.edu.br', telefone: '(85) 3400-5000', cidade: 'Fortaleza',      uf: 'CE', empresa_id: eid, ativo: true },
  ];
  const { data: cliExist } = await db.from('clientes').select('id, nome, cpf_cnpj').eq('empresa_id', eid).in('cpf_cnpj', cliSeed.map(c => c.cpf_cnpj));
  const cliDocs = (cliExist || []).map(c => c.cpf_cnpj);
  const cliNovos = cliSeed.filter(c => !cliDocs.includes(c.cpf_cnpj));
  let clientes = cliExist || [];
  if (cliNovos.length > 0) {
    const { data: ins, error: e1 } = await db.from('clientes').insert(cliNovos).select();
    if (e1) { console.error('Erro clientes:', e1.message); process.exit(1); }
    clientes = [...clientes, ...ins];
  }
  console.log(clientes.length, 'clientes disponíveis (' + cliNovos.length + ' novos)');

  // ── 3. Fornecedores ──────────────────────────────────────────
  const fornSeed = [
    { nome: 'Locacoes Prime Imoveis', tipo: 'PJ', cpf_cnpj: '55.666.777/0001-88', email: 'cob@locacoes.com.br',  telefone: '(11) 3500-6000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Imoveis',           empresa_id: eid, ativo: true },
    { nome: 'Folha Certa RH',         tipo: 'PJ', cpf_cnpj: '66.777.888/0001-99', email: 'rh@folhacerta.com.br', telefone: '(11) 3600-7000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Recursos Humanos',  empresa_id: eid, ativo: true },
    { nome: 'Energisa SP',            tipo: 'PJ', cpf_cnpj: '08.324.196/0001-81', email: 'emp@energisa.com.br',  telefone: '(11) 3700-8000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Concessionaria',    empresa_id: eid, ativo: true },
    { nome: 'Vivo Empresas',          tipo: 'PJ', cpf_cnpj: '02.558.157/0001-62', email: 'emp@vivo.com.br',      telefone: '(11) 3800-9000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Telecomunicacoes',  empresa_id: eid, ativo: true },
    { nome: 'AWS Brasil',             tipo: 'PJ', cpf_cnpj: '23.927.163/0001-27', email: 'bill@aws.com',         telefone: '(11) 3900-0001', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Cloud TI',           empresa_id: eid, ativo: true },
    { nome: 'Papelaria JK',           tipo: 'PJ', cpf_cnpj: '77.888.999/0001-00', email: 'vnd@papelariajk.com', telefone: '(11) 3001-1000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Mat. Escritorio',    empresa_id: eid, ativo: true },
    { nome: 'Contabilidade Exata',    tipo: 'PJ', cpf_cnpj: '88.999.000/0001-11', email: 'ctt@contabil.com.br',  telefone: '(11) 3002-2000', cidade: 'Sao Paulo', uf: 'SP', categoria: 'Servicos Contabeis', empresa_id: eid, ativo: true },
  ];
  const { data: fornExist } = await db.from('fornecedores').select('id, nome, cpf_cnpj').eq('empresa_id', eid).in('cpf_cnpj', fornSeed.map(f => f.cpf_cnpj));
  const fornDocs = (fornExist || []).map(f => f.cpf_cnpj);
  const fornNovos = fornSeed.filter(f => !fornDocs.includes(f.cpf_cnpj));
  let forns = fornExist || [];
  if (fornNovos.length > 0) {
    const { data: ins, error: e2 } = await db.from('fornecedores').insert(fornNovos).select();
    if (e2) { console.error('Erro fornecedores:', e2.message); process.exit(1); }
    forns = [...forns, ...ins];
  }
  console.log(forns.length, 'fornecedores disponíveis (' + fornNovos.length + ' novos)');

  // ── 4. Plano de contas ───────────────────────────────────────
  const suffix = eid.slice(0, 4);
  const planoSeed = [
    { codigo: `3.1-${suffix}`, nome: 'Receita de Servicos',      tipo: 'RECEITA', natureza: 'CREDORA',  nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `3.2-${suffix}`, nome: 'Receita de Produtos',      tipo: 'RECEITA', natureza: 'CREDORA',  nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `3.3-${suffix}`, nome: 'Outras Receitas',          tipo: 'RECEITA', natureza: 'CREDORA',  nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `4.1-${suffix}`, nome: 'Despesas de Pessoal',      tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `4.2-${suffix}`, nome: 'Despesas Administrativas', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `4.4-${suffix}`, nome: 'Despesas com TI',          tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `4.5-${suffix}`, nome: 'Despesas com Marketing',   tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, empresa_id: eid, ativo: true },
    { codigo: `4.6-${suffix}`, nome: 'Servicos de Terceiros',    tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, empresa_id: eid, ativo: true },
  ];
  // Busca os que já existem para esta empresa
  const { data: planoExist } = await db.from('plano_contas')
    .select('id, codigo').eq('empresa_id', eid).in('codigo', planoSeed.map(p => p.codigo));
  const codigosExist = (planoExist || []).map(p => p.codigo);
  const planoNovos = planoSeed.filter(p => !codigosExist.includes(p.codigo));
  let plano = planoExist || [];
  if (planoNovos.length > 0) {
    const { data: ins, error: e3 } = await db.from('plano_contas').insert(planoNovos).select('id, codigo');
    if (e3) { console.error('Erro plano_contas:', e3.message); process.exit(1); }
    plano = [...plano, ...(ins || [])];
  }
  console.log(plano.length, 'contas do plano disponíveis (' + planoNovos.length + ' novas)');

  const cli   = s => clientes.find(c => c.nome.includes(s))?.id || clientes[0].id;
  const forn  = s => forns.find(f => f.nome.includes(s))?.id    || forns[0].id;
  const conta = c => {
    // Tenta com sufixo primeiro, depois sem
    return plano.find(p => p.codigo === `${c}-${suffix}`)?.id
        || plano.find(p => p.codigo === c)?.id
        || null;
  };

  // ── 5. Lançamentos (6 meses de histórico) ───────────────────
  const lancs = [];
  for (let m = 5; m >= 0; m--) {
    lancs.push(
      { descricao: 'Servicos - Construtora Horizonte', tipo: 'RECEITA', valor: rnd(18000,24000), data_competencia: diaNoMes(m,5),  data_pagamento: diaNoMes(m,5),  status: 'PAGO', conta_id: conta('3.1'), cliente_id:    cli('Horizonte'),  empresa_id: eid },
      { descricao: 'Consultoria - Bom Preco',          tipo: 'RECEITA', valor: rnd(9000,12000),  data_competencia: diaNoMes(m,10), data_pagamento: diaNoMes(m,10), status: 'PAGO', conta_id: conta('3.1'), cliente_id:    cli('Bom Preco'),  empresa_id: eid },
      { descricao: 'Licenca software - Saude Total',   tipo: 'RECEITA', valor: rnd(4500,6000),   data_competencia: diaNoMes(m,15), data_pagamento: diaNoMes(m,15), status: 'PAGO', conta_id: conta('3.2'), cliente_id:    cli('Saude'),      empresa_id: eid },
      { descricao: 'Suporte - Escola Progresso',       tipo: 'RECEITA', valor: rnd(3000,4500),   data_competencia: diaNoMes(m,20), data_pagamento: diaNoMes(m,20), status: 'PAGO', conta_id: conta('3.1'), cliente_id:    cli('Progresso'),  empresa_id: eid },
      { descricao: 'Honorarios - Roberto Mendes',      tipo: 'RECEITA', valor: rnd(5000,7000),   data_competencia: diaNoMes(m,25), data_pagamento: diaNoMes(m,25), status: 'PAGO', conta_id: conta('3.1'), cliente_id:    cli('Roberto'),    empresa_id: eid },
      { descricao: 'Folha de pagamento',               tipo: 'DESPESA', valor: rnd(22000,26000), data_competencia: diaNoMes(m,5),  data_pagamento: diaNoMes(m,5),  status: 'PAGO', conta_id: conta('4.1'), fornecedor_id: forn('Folha'),     empresa_id: eid },
      { descricao: 'Encargos sociais FGTS/INSS',       tipo: 'DESPESA', valor: rnd(7000,9000),   data_competencia: diaNoMes(m,5),  data_pagamento: diaNoMes(m,5),  status: 'PAGO', conta_id: conta('4.1'), fornecedor_id: forn('Folha'),     empresa_id: eid },
      { descricao: 'Aluguel sede',                     tipo: 'DESPESA', valor: 8500,              data_competencia: diaNoMes(m,5),  data_pagamento: diaNoMes(m,5),  status: 'PAGO', conta_id: conta('4.2'), fornecedor_id: forn('Locacoes'),  empresa_id: eid },
      { descricao: 'Energia eletrica',                 tipo: 'DESPESA', valor: rnd(1200,1800),   data_competencia: diaNoMes(m,10), data_pagamento: diaNoMes(m,10), status: 'PAGO', conta_id: conta('4.2'), fornecedor_id: forn('Energisa'),  empresa_id: eid },
      { descricao: 'Internet e telefonia',             tipo: 'DESPESA', valor: rnd(800,1200),    data_competencia: diaNoMes(m,10), data_pagamento: diaNoMes(m,10), status: 'PAGO', conta_id: conta('4.2'), fornecedor_id: forn('Vivo'),      empresa_id: eid },
      { descricao: 'AWS infraestrutura cloud',         tipo: 'DESPESA', valor: rnd(2500,4000),   data_competencia: diaNoMes(m,15), data_pagamento: diaNoMes(m,15), status: 'PAGO', conta_id: conta('4.4'), fornecedor_id: forn('AWS'),       empresa_id: eid },
      { descricao: 'Honorarios contabeis',             tipo: 'DESPESA', valor: 2200,              data_competencia: diaNoMes(m,20), data_pagamento: diaNoMes(m,20), status: 'PAGO', conta_id: conta('4.6'), fornecedor_id: forn('Contabil'),  empresa_id: eid },
      { descricao: 'Material de escritorio',           tipo: 'DESPESA', valor: rnd(400,800),     data_competencia: diaNoMes(m,25), data_pagamento: diaNoMes(m,25), status: 'PAGO', conta_id: conta('4.2'), fornecedor_id: forn('Papelaria'), empresa_id: eid },
    );
  }
  // Pendentes do mês atual
  lancs.push(
    { descricao: 'Adiantamento - Ana Paula Ferreira', tipo: 'RECEITA', valor: 3500, data_competencia: diasAtras(5), status: 'PENDENTE', conta_id: conta('3.3'), cliente_id: cli('Ana'), empresa_id: eid },
    { descricao: 'Google Ads campanha Q2',            tipo: 'DESPESA', valor: 1800, data_competencia: diasAtras(3), status: 'PENDENTE', conta_id: conta('4.5'),                         empresa_id: eid },
  );
  const { error: e4 } = await db.from('lancamentos').insert(lancs);
  if (e4) { console.error('Erro lancamentos:', e4.message); process.exit(1); }
  console.log(lancs.length, 'lancamentos criados');

  // ── 6. Contas a Pagar ────────────────────────────────────────
  const { error: e5 } = await db.from('contas_pagar').insert([
    { fornecedor_id: forn('Locacoes'),  descricao: 'Aluguel mes anterior',        valor_original: 8500,  valor_pago: 8500,  data_emissao: diasAtras(35), data_vencimento: diasAtras(30), data_pagamento: diasAtras(30), status: 'PAGA',    conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('Energisa'),  descricao: 'Energia eletrica anterior',   valor_original: 1450,  valor_pago: 1450,  data_emissao: diasAtras(25), data_vencimento: diasAtras(20), data_pagamento: diasAtras(20), status: 'PAGA',    conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('AWS'),       descricao: 'AWS fatura anterior',          valor_original: 3200,  valor_pago: 3200,  data_emissao: diasAtras(20), data_vencimento: diasAtras(15), data_pagamento: diasAtras(15), status: 'PAGA',    conta_id: conta('4.4'), empresa_id: eid },
    { fornecedor_id: forn('Locacoes'),  descricao: 'Aluguel mes corrente',         valor_original: 8500,  valor_pago: 0,     data_emissao: diasAtras(5),  data_vencimento: diasFrente(5),  data_pagamento: null, status: 'ABERTA',  conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('Folha'),     descricao: 'Folha pagamento corrente',     valor_original: 24500, valor_pago: 0,     data_emissao: diasAtras(3),  data_vencimento: diasFrente(2),  data_pagamento: null, status: 'ABERTA',  conta_id: conta('4.1'), empresa_id: eid },
    { fornecedor_id: forn('Vivo'),      descricao: 'Telefonia mes corrente',       valor_original: 980,   valor_pago: 0,     data_emissao: diasAtras(8),  data_vencimento: diasFrente(7),  data_pagamento: null, status: 'ABERTA',  conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('AWS'),       descricao: 'AWS fatura corrente',          valor_original: 3600,  valor_pago: 0,     data_emissao: diasAtras(2),  data_vencimento: diasFrente(13), data_pagamento: null, status: 'ABERTA',  conta_id: conta('4.4'), empresa_id: eid },
    { fornecedor_id: forn('Contabil'),  descricao: 'Honorarios contabeis corrente',valor_original: 2200,  valor_pago: 0,     data_emissao: diasAtras(1),  data_vencimento: diasFrente(10), data_pagamento: null, status: 'ABERTA',  conta_id: conta('4.6'), empresa_id: eid },
    { fornecedor_id: forn('Papelaria'), descricao: 'Material escritorio atrasado', valor_original: 650,   valor_pago: 0,     data_emissao: diasAtras(20), data_vencimento: diasAtras(7),   data_pagamento: null, status: 'VENCIDA', conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('Energisa'),  descricao: 'Energia eletrica corrente',    valor_original: 1380,  valor_pago: 0,     data_emissao: diasAtras(15), data_vencimento: diasAtras(3),   data_pagamento: null, status: 'VENCIDA', conta_id: conta('4.2'), empresa_id: eid },
    { fornecedor_id: forn('Folha'),     descricao: 'Encargos sociais parcela 2/3', valor_original: 8400,  valor_pago: 2800,  data_emissao: diasAtras(10), data_vencimento: diasFrente(20), data_pagamento: null, status: 'PARCIAL', conta_id: conta('4.1'), empresa_id: eid },
  ]);
  if (e5) { console.error('Erro contas_pagar:', e5.message); process.exit(1); }
  console.log('11 contas a pagar criadas');

  // ── 7. Contas a Receber ──────────────────────────────────────
  const { error: e6 } = await db.from('contas_receber').insert([
    { cliente_id: cli('Horizonte'), descricao: 'Servicos fatura anterior',        valor_original: 21000, valor_recebido: 21000, data_emissao: diasAtras(35), data_vencimento: diasAtras(28), data_recebimento: diasAtras(27), status: 'RECEBIDA', conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Bom Preco'), descricao: 'Consultoria fatura anterior',     valor_original: 10500, valor_recebido: 10500, data_emissao: diasAtras(30), data_vencimento: diasAtras(23), data_recebimento: diasAtras(22), status: 'RECEBIDA', conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Saude'),     descricao: 'Licenca software anterior',       valor_original: 5200,  valor_recebido: 5200,  data_emissao: diasAtras(25), data_vencimento: diasAtras(18), data_recebimento: diasAtras(18), status: 'RECEBIDA', conta_id: conta('3.2'), empresa_id: eid },
    { cliente_id: cli('Horizonte'), descricao: 'Servicos fatura corrente',        valor_original: 22500, valor_recebido: 0,     data_emissao: diasAtras(5),  data_vencimento: diasFrente(10), data_recebimento: null, status: 'ABERTA',   conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Bom Preco'), descricao: 'Consultoria fatura corrente',     valor_original: 11000, valor_recebido: 0,     data_emissao: diasAtras(3),  data_vencimento: diasFrente(12), data_recebimento: null, status: 'ABERTA',   conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Progresso'), descricao: 'Suporte tecnico corrente',        valor_original: 4000,  valor_recebido: 0,     data_emissao: diasAtras(2),  data_vencimento: diasFrente(15), data_recebimento: null, status: 'ABERTA',   conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Roberto'),   descricao: 'Honorarios fatura corrente',      valor_original: 6000,  valor_recebido: 0,     data_emissao: diasAtras(1),  data_vencimento: diasFrente(8),  data_recebimento: null, status: 'ABERTA',   conta_id: conta('3.1'), empresa_id: eid },
    { cliente_id: cli('Ana'),       descricao: 'Servico avulso em atraso',        valor_original: 2800,  valor_recebido: 0,     data_emissao: diasAtras(25), data_vencimento: diasAtras(10),  data_recebimento: null, status: 'VENCIDA',  conta_id: conta('3.3'), empresa_id: eid },
    { cliente_id: cli('Saude'),     descricao: 'Licenca software parcela 1/2',    valor_original: 10400, valor_recebido: 5200,  data_emissao: diasAtras(15), data_vencimento: diasFrente(5),  data_recebimento: null, status: 'PARCIAL',  conta_id: conta('3.2'), empresa_id: eid },
  ]);
  if (e6) { console.error('Erro contas_receber:', e6.message); process.exit(1); }
  console.log('9 contas a receber criadas');

  console.log('\n✅ Seed concluido!');
  console.log('Empresa ID:', eid);
  console.log('\nPara vincular seu usuario, execute no Supabase SQL Editor:');
  console.log(`INSERT INTO empresa_usuarios (empresa_id, user_id, perfil, ativo) VALUES ('${eid}', '<SEU_USER_ID>', 'ADMIN', true);`);
}

run().catch(e => { console.error('Erro fatal:', e.message, e.stack); process.exit(1); });
