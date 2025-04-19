const crypto = require("crypto");

function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
}

module.exports = {
  generateResetToken,
};