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