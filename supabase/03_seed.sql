-- FluxD · Dados iniciais (plano de contas)
-- Execute no SQL Editor do Supabase após 02_financial_tables.sql
-- ON CONFLICT DO NOTHING garante idempotência

INSERT INTO plano_contas (codigo, nome, tipo, natureza, nivel) VALUES
  ('1',     'ATIVO',                      'ATIVO',    'DEVEDORA', 1),
  ('1.1',   'Ativo Circulante',           'ATIVO',    'DEVEDORA', 2),
  ('1.1.1', 'Caixa e Equivalentes',       'ATIVO',    'DEVEDORA', 3),
  ('1.1.2', 'Contas a Receber',           'ATIVO',    'DEVEDORA', 3),
  ('2',     'PASSIVO',                    'PASSIVO',  'CREDORA',  1),
  ('2.1',   'Passivo Circulante',         'PASSIVO',  'CREDORA',  2),
  ('2.1.1', 'Contas a Pagar',             'PASSIVO',  'CREDORA',  3),
  ('3',     'RECEITAS',                   'RECEITA',  'CREDORA',  1),
  ('3.1',   'Receita de Mensalidades',    'RECEITA',  'CREDORA',  2),
  ('3.2',   'Receita de Matrículas',      'RECEITA',  'CREDORA',  2),
  ('3.3',   'Receita de Cursos',          'RECEITA',  'CREDORA',  2),
  ('3.4',   'Outras Receitas',            'RECEITA',  'CREDORA',  2),
  ('4',     'DESPESAS',                   'DESPESA',  'DEVEDORA', 1),
  ('4.1',   'Despesas de Pessoal',        'DESPESA',  'DEVEDORA', 2),
  ('4.1.1', 'Salários e Ordenados',       'DESPESA',  'DEVEDORA', 3),
  ('4.1.2', 'Encargos Sociais',           'DESPESA',  'DEVEDORA', 3),
  ('4.2',   'Despesas Administrativas',   'DESPESA',  'DEVEDORA', 2),
  ('4.2.1', 'Aluguel',                    'DESPESA',  'DEVEDORA', 3),
  ('4.2.2', 'Energia Elétrica',           'DESPESA',  'DEVEDORA', 3),
  ('4.2.3', 'Água e Esgoto',              'DESPESA',  'DEVEDORA', 3),
  ('4.2.4', 'Internet e Telefone',        'DESPESA',  'DEVEDORA', 3),
  ('4.2.5', 'Material de Escritório',     'DESPESA',  'DEVEDORA', 3),
  ('4.3',   'Despesas Financeiras',       'DESPESA',  'DEVEDORA', 2),
  ('4.3.1', 'Juros e Encargos',           'DESPESA',  'DEVEDORA', 3),
  ('4.3.2', 'Tarifas Bancárias',          'DESPESA',  'DEVEDORA', 3),
  ('4.4',   'Despesas com Marketing',     'DESPESA',  'DEVEDORA', 2),
  ('4.5',   'Despesas com TI',            'DESPESA',  'DEVEDORA', 2)
ON CONFLICT (codigo) DO NOTHING;
