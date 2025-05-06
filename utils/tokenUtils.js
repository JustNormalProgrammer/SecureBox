const crypto = require("crypto");

/**
 * Generuje token resetu hasła.
 * @returns {string} Token resetu hasła
 */
function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
}

module.exports = {
  generateResetToken,
};