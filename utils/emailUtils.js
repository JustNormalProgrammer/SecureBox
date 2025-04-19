const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendResetEmail(to, resetLink) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Securebox" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: "Resetowanie hasła",
    text: `Witaj,\n\nAby zresetować hasło, kliknij poniższy link:\n${resetLink}\n\nLink jest ważny przez 1 godzinę.\n\nPozdrawiamy,\nSecureBox`,
    html: `
      <h2>Witaj!</h2>
      <p>Aby zresetować hasło, kliknij poniższy link:</p>
      <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zresetuj hasło</a>
      <p>Link jest ważny przez 1 godzinę.</p>
      <p>Pozdrawiamy,<br>SecureBox</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("E-mail wysłany: " + info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Błąd podczas wysyłania e-maila:", error);
    throw new Error("Nie udało się wysłać e-maila resetującego hasło");
  }
}

module.exports = {
  sendResetEmail,
};