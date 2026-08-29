/**
 * AES-256-CBC encryption/decryption for PSG payment gateway.
 * 
 * This is a byte-for-byte port of the PHP openssl_encrypt/openssl_decrypt
 * used in payprocess.php and payconfirm.php. The same key and IV are used
 * to ensure the PSG CMS gateway (https://cms.psgps.edu.in/payapp) can
 * decrypt our requests and we can decrypt their callbacks.
 */
const crypto = require('crypto');

const CIPHER = 'aes-256-cbc';

function encrypt(text) {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;
  const iv = Buffer.from(process.env.PAYMENT_IV, 'hex');

  const cipher = crypto.createCipheriv(CIPHER, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decrypt(text) {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;
  const iv = Buffer.from(process.env.PAYMENT_IV, 'hex');

  const decipher = crypto.createDecipheriv(CIPHER, key, iv);
  let decrypted = decipher.update(text, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
