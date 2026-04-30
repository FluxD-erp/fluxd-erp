/**
 * Parser OFX/QFX para o FluxD
 * Suporta OFX SGML (bancos BR) e OFX XML
 */

/** Converte data OFX (YYYYMMDD ou YYYYMMDDHHmmss) → 'YYYY-MM-DD' */
function parseOfxDate(raw) {
  const s = (raw || '').toString().trim().replace(/\[.*\]/, '');
  if (s.length >= 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return null;
}

/** Extrai valor entre tags SGML: <TAG>valor ou <TAG>valor</TAG> */
function sgmlTag(text, tag) {
  const re = new RegExp(`<${tag}>([^<\r\n]*)`, 'i');
  const m  = text.match(re);
  return m ? m[1].trim() : null;
}

/** Parseia bloco SGML de uma transação */
function parseSgmlTrn(block) {
  const type   = sgmlTag(block, 'TRNTYPE') || 'OTHER';
  const dtRaw  = sgmlTag(block, 'DTPOSTED') || sgmlTag(block, 'DTUSER') || '';
  const amount = parseFloat((sgmlTag(block, 'TRNAMT') || '0').replace(',', '.'));
  const fitid  = sgmlTag(block, 'FITID')   || `ofx_${Math.random()}`;
  const memo   = (sgmlTag(block, 'MEMO')   || sgmlTag(block, 'NAME') || '').replace(/&amp;/g, '&');

  return {
    fitid,
    date  : parseOfxDate(dtRaw),
    amount: Math.abs(amount),
    tipo  : amount >= 0 ? 'RECEITA' : 'DESPESA',
    memo  : memo || type,
    raw   : { type, amount },
  };
}

/** Parseia OFX SGML (formato clássico dos bancos brasileiros) */
function parseSgml(text) {
  // Separa o header OFX do corpo
  const bodyStart = text.indexOf('<OFX>');
  const body = bodyStart >= 0 ? text.slice(bodyStart) : text;

  const transactions = [];
  const trnRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let   m;

  if (trnRe.test(body)) {
    // Tem fechamento de tag — trata como XML-like
    const re2 = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    while ((m = re2.exec(body)) !== null) {
      const trn = parseSgmlTrn(m[1]);
      if (trn.date) transactions.push(trn);
    }
  } else {
    // SGML puro (sem </STMTTRN>): divide pelo início de cada bloco
    const blocks = body.split(/<STMTTRN>/i).slice(1);
    for (const block of blocks) {
      const trn = parseSgmlTrn(block);
      if (trn.date) transactions.push(trn);
    }
  }

  // Metadados da conta
  const bankId  = sgmlTag(body, 'BANKID')  || sgmlTag(body, 'ORG')   || '';
  const acctId  = sgmlTag(body, 'ACCTID')  || '';
  const acctType= sgmlTag(body, 'ACCTTYPE')|| '';
  const balance = parseFloat((sgmlTag(body, 'BALAMT') || '0').replace(',', '.'));
  const balDate = parseOfxDate(sgmlTag(body, 'DTASOF') || '');
  const dtStart = parseOfxDate(sgmlTag(body, 'DTSTART') || '');
  const dtEnd   = parseOfxDate(sgmlTag(body, 'DTEND')   || '');

  return { transactions, bankId, acctId, acctType, balance, balDate, dtStart, dtEnd };
}

/** Entry point — aceita File ou string */
export async function parseOfx(input) {
  let text;
  if (typeof input === 'string') {
    text = input;
  } else {
    // É um File/Blob
    text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      // Tenta UTF-8 primeiro; bancos BR às vezes usam ISO-8859-1
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(input, 'ISO-8859-1');
    });
  }

  // Normaliza quebras de linha
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return parseSgml(text);
}

/** Tenta fazer match automático entre transação OFX e lista de lançamentos
 *  Retorna o lançamento mais provável ou null
 *  Critério: mesmo valor (tolerância 1 centavo) + mesma data ± 1 dia + mesmo tipo
 */
export function autoMatch(ofxTrn, lancamentos) {
  const ofxDate = new Date(ofxTrn.date + 'T12:00:00');

  const candidatos = lancamentos.filter(l => {
    if (l.conciliado) return false;
    if (l.tipo !== ofxTrn.tipo) return false;

    const diff = Math.abs(Number(l.valor) - ofxTrn.amount);
    if (diff > 0.02) return false;

    const lDate = new Date(l.data_competencia + 'T12:00:00');
    const dayDiff = Math.abs((lDate - ofxDate) / 86400000);
    return dayDiff <= 2;
  });

  if (candidatos.length === 0) return null;

  // Pontua: mesma data exata = +2, descrição similar = +1
  const scored = candidatos.map(l => {
    let score = 0;
    if (l.data_competencia === ofxTrn.date) score += 2;
    const memo  = ofxTrn.memo.toLowerCase();
    const desc  = (l.descricao || '').toLowerCase();
    if (memo.includes(desc.slice(0, 6)) || desc.includes(memo.slice(0, 6))) score += 1;
    return { l, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].l;
}
