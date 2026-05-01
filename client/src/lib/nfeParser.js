/**
 * nfeParser.js — Parser de XML NFe (NF-e de entrada)
 *
 * Extrai do XML:
 *  - Emitente: CNPJ, razão social, nome fantasia
 *  - NF: número, série, data de emissão, valor total, chave de acesso
 *  - Duplicatas: nDup, dVenc, vDup
 *
 * Suporta XML com e sem namespace (nfeProc, NFe, nfeResultMsg).
 */

function getTag(node, tag) {
  const els = node.getElementsByTagName(tag);
  if (els.length > 0) return els[0].textContent?.trim() || '';
  return '';
}

/**
 * Parseia o XML de uma NFe e retorna os dados relevantes.
 * @param {string} xmlString
 * @returns {{ emitente, nf, duplicatas, erro? }}
 */
export function parseNFe(xmlString) {
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) return { erro: 'XML inválido ou corrompido.' };

    // ── Emitente ─────────────────────────────────────────────
    const emitNode = doc.getElementsByTagName('emit')[0];
    if (!emitNode) return { erro: 'Elemento <emit> não encontrado. Verifique se é um XML de NFe válido.' };

    const cnpjRaw = getTag(emitNode, 'CNPJ');
    if (!cnpjRaw) return { erro: 'CNPJ do emitente não encontrado no XML.' };

    const emitente = {
      cnpj        : cnpjRaw,
      cnpj_fmt    : cnpjRaw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
      razao_social: getTag(emitNode, 'xNome'),
      fantasia    : getTag(emitNode, 'xFant') || getTag(emitNode, 'xNome'),
    };

    // ── Dados da NF ──────────────────────────────────────────
    const ideNode   = doc.getElementsByTagName('ide')[0];
    const totalNode = doc.getElementsByTagName('ICMSTot')[0];

    const dhEmi = getTag(ideNode || doc, 'dhEmi') || getTag(ideNode || doc, 'dEmi');

    const infNFe  = doc.getElementsByTagName('infNFe')[0];
    const chaveId = infNFe?.getAttribute('Id')?.replace(/^NFe/, '') || getTag(doc, 'chNFe');

    const nf = {
      numero      : getTag(ideNode || doc, 'nNF'),
      serie       : getTag(ideNode || doc, 'serie'),
      data_emissao: dhEmi.slice(0, 10),
      chave       : chaveId,
      valor_total : parseFloat((totalNode ? getTag(totalNode, 'vNF') : getTag(doc, 'vNF')) || '0'),
    };

    if (!nf.numero) return { erro: 'Número da NF não encontrado no XML.' };

    // ── Duplicatas ───────────────────────────────────────────
    const cobrNode = doc.getElementsByTagName('cobr')[0];
    const dupNodes = cobrNode
      ? cobrNode.getElementsByTagName('dup')
      : doc.getElementsByTagName('dup');

    const duplicatas = [];

    if (dupNodes.length === 0) {
      // Pagamento à vista — cria uma duplicata com o valor total
      duplicatas.push({
        numero    : nf.numero,
        vencimento: nf.data_emissao,
        valor     : nf.valor_total,
        avista    : true,
      });
    } else {
      for (const dup of dupNodes) {
        const val = parseFloat(getTag(dup, 'vDup') || '0');
        if (val > 0) {
          duplicatas.push({
            numero    : getTag(dup, 'nDup') || nf.numero,
            vencimento: getTag(dup, 'dVenc'),
            valor     : val,
            avista    : false,
          });
        }
      }
    }

    if (duplicatas.length === 0) return { erro: 'Nenhuma duplicata encontrada no XML.' };

    return { emitente, nf, duplicatas };
  } catch (e) {
    return { erro: `Erro ao processar XML: ${e.message}` };
  }
}
