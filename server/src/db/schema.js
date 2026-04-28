const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../unicri.db');

let _db = null;

class DbShim {
  constructor(sqlJsDb) {
    this._db = sqlJsDb;
  }

  _save() {
    const data = this._db.export();
    if (data && data.length > 0) {
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
  }

  exec(sql) {
    try {
      this._db.exec(sql);
      this._save();
    } catch (e) {
      // Ignora pragmas não suportados no sql.js (WAL, foreign_keys)
      if (!sql.trim().toUpperCase().startsWith('PRAGMA')) throw e;
    }
    return this;
  }

  prepare(sql) {
    const sqlJsDb = this._db;
    const save = () => this._save();
    return {
      run(...params) {
        try {
          const stmt = sqlJsDb.prepare(sql);
          stmt.run(params.length ? params : null);
          stmt.free();
          save();
        } catch (e) {
          throw new Error(`SQL error in run(): ${e.message || e}\nSQL: ${sql}`);
        }
        return this;
      },
      get(...params) {
        try {
          const stmt = sqlJsDb.prepare(sql);
          if (params.length) stmt.bind(params);
          let row;
          if (stmt.step()) {
            // Não passar argumento para getAsObject — evita re-bind/re-step
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            row = {};
            cols.forEach((col, i) => { row[col] = vals[i]; });
          }
          stmt.free();
          return row;
        } catch (e) {
          throw new Error(`SQL error in get(): ${e.message || e}\nSQL: ${sql}`);
        }
      },
      all(...params) {
        try {
          const stmt = sqlJsDb.prepare(sql);
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((col, i) => { row[col] = vals[i]; });
            rows.push(row);
          }
          stmt.free();
          return rows;
        } catch (e) {
          throw new Error(`SQL error in all(): ${e.message || e}\nSQL: ${sql}`);
        }
      },
    };
  }

  // Executa uma query diretamente via db.exec() (ignora parâmetros)
  execQuery(sql) {
    const rows = this._db.exec(sql);
    if (rows && rows[0]) {
      const { columns, values } = rows[0];
      return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    }
    return [];
  }

  transaction(fn) {
    const save = () => this._save();
    return function(...args) {
      const result = fn(...args);
      save();
      return result;
    };
  }
}

async function initDb() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  let sqlJsDb;
  if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
    const buf = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(buf);
  } else {
    sqlJsDb = new SQL.Database();
  }
  _db = new DbShim(sqlJsDb);
  initSchema();
}

function getDb() {
  if (!_db) throw new Error('DB não inicializado');
  return _db;
}

function initSchema() {
  _db._db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      nome TEXT NOT NULL,
      razao_social TEXT,
      cpf_cnpj TEXT UNIQUE,
      email TEXT,
      telefone TEXT,
      endereco TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      cep TEXT,
      situacao_cadastral TEXT,
      atividade_principal TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS fornecedores (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      nome TEXT NOT NULL,
      razao_social TEXT,
      cpf_cnpj TEXT UNIQUE,
      email TEXT,
      telefone TEXT,
      endereco TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      cep TEXT,
      situacao_cadastral TEXT,
      atividade_principal TEXT,
      categoria TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS plano_contas (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      natureza TEXT NOT NULL,
      nivel INTEGER DEFAULT 1,
      conta_pai_id TEXT,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS lancamentos (
      id TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      data_competencia TEXT NOT NULL,
      data_pagamento TEXT,
      status TEXT DEFAULT 'PENDENTE',
      conta_id TEXT,
      cliente_id TEXT,
      fornecedor_id TEXT,
      numero_documento TEXT,
      observacao TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contas_pagar (
      id TEXT PRIMARY KEY,
      fornecedor_id TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor_original REAL NOT NULL,
      valor_pago REAL DEFAULT 0,
      data_emissao TEXT NOT NULL,
      data_vencimento TEXT NOT NULL,
      data_pagamento TEXT,
      status TEXT DEFAULT 'ABERTA',
      numero_documento TEXT,
      conta_id TEXT,
      observacao TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contas_receber (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor_original REAL NOT NULL,
      valor_recebido REAL DEFAULT 0,
      data_emissao TEXT NOT NULL,
      data_vencimento TEXT NOT NULL,
      data_recebimento TEXT,
      status TEXT DEFAULT 'ABERTA',
      numero_documento TEXT,
      conta_id TEXT,
      observacao TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS centros_custo (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now'))
    );
  `);
  // Persiste o schema imediatamente
  _db._save();
}

module.exports = { getDb, initDb };
