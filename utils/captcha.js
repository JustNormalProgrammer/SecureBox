/**
 * Funkcja walidująca odpowiedź reCAPTCHA v3 przy użyciu Google reCAPTCHA API.
 *
 * @param {string} token - Token reCAPTCHA, który należy zweryfikować.
 * @returns {Promise<boolean>} - Zwraca `true` jeśli walidacja była pomyślna, w przeciwnym razie `false`.
 * 
 * @throws {Error} - W przypadku błędu podczas komunikacji z Google reCAPTCHA API, funkcja loguje błąd w konsoli.
 */

async function  validateRecaptcha(token)  {
    const secretKey = process.env.CAPTCHA_SECRET; 
    if(!secretKey) return false;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
    try {
      const response = await fetch(verificationUrl, {
        method: "POST",
      });
  
      const data = await response.json();
      return data.success && data.score > 0.5;
    } catch (error) {
      console.error("Błąd walidacji reCAPTCHA:", error);
      return false;
    }
  };

module.exports = {
    validateRecaptcha,
};