const crypto = require('crypto');

async function getHash(passwordId) {
    const hash = crypto.createHash('sha256').update(passwordId).digest('hex');
    return hash.slice(0, 8)+".txt"
}

module.exports = {
    getHash,
  };
