const crypto = require('crypto');

/**
 * Funkcja generująca skrót (hash) SHA-256 na podstawie identyfikatora hasła.
 * 
 * @param {string} passwordId - Identyfikator hasła, który ma zostać zhashowany.
 * @returns {Promise<string>} - Zwraca skrót hasła w formacie 8 pierwszych znaków skrótu SHA-256 + `.txt`.
 */
async function getHash(passwordId) {
    const hash = crypto.createHash('sha256').update(passwordId).digest('hex');
    return hash.slice(0, 8)+".txt"
}

module.exports = {
    getHash,
  };
