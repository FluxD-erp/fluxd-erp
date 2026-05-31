/**
 * FluxD · Utilitário de criptografia AES-256-GCM
 *
 * Usado para proteger credenciais sensíveis (certificados, chaves privadas)
 * antes de gravar no banco de dados.
 *
 * Variável de ambiente necessária:
 *   ENCRYPTION_KEY = 64 caracteres hex (= 32 bytes)
 *
 * Gerar uma chave segura:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== 64)
    throw new Error('ENCRYPTION_KEY deve ter exatamente 64 caracteres hex (32 bytes).');
  return Buffer.from(hex, 'hex');
}

/**
 * Criptografa um texto.
 * Formato armazenado: "iv(hex):authTag(hex):ciphertext(hex)"
 */
function encrypt(texto) {
  if (!texto) return null;
  const key    = getKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc    = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * Descriptografa um valor armazenado pelo encrypt().
 * Se o valor não estiver no formato criptografado (dados legados), retorna como está.
 */
function decrypt(stored) {
  if (!stored) return null;
  // Verifica se é dado criptografado (formato iv:tag:cipher)
  const partes = stored.split(':');
  if (partes.length !== 3) return stored; // dado legado — retorna sem descriptografar
  const [ivHex, tagHex, encHex] = partes;
  const key      = getKey();
  const iv       = Buffer.from(ivHex,  'hex');
  const tag      = Buffer.from(tagHex, 'hex');
  const enc      = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
