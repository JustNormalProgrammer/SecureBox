const nodemailer = require('nodemailer');
const { sendResetEmail } = require('../utils/emailUtils');

describe('sendResetEmail', () => {
  let mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_USER = 'test@securebox.com';
    process.env.EMAIL_PASS = 'testpass';
    mockTransporter = {
      sendMail: jest.fn(),
    };
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(mockTransporter);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('powinien wysłać e-mail i zwrócić obiekt sukcesu', async () => {
    mockTransporter.sendMail.mockResolvedValue({ messageId: '12345' });
    const result = await sendResetEmail('user@example.com', 'http://reset.link');
    expect(result).toEqual({ success: true, messageId: '12345' });
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('E-mail wysłany: 12345');
  });

  it('powinien skonfigurować transporter z poprawnymi zmiennymi środowiskowymi', async () => {
    mockTransporter.sendMail.mockResolvedValue({ messageId: '12345' });
    await sendResetEmail('user@example.com', 'http://reset.link');
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@securebox.com',
        pass: 'testpass',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  });

  it('powinien wysłać e-mail z poprawną zawartością', async () => {
    mockTransporter.sendMail.mockResolvedValue({ messageId: '12345' });
    await sendResetEmail('user@example.com', 'http://reset.link');
    expect(mockTransporter.sendMail).toHaveBeenCalledWith({
      from: '"Securebox" <test@securebox.com>',
      to: 'user@example.com',
      subject: 'Resetowanie hasła',
      text: 'Witaj,\n\nAby zresetować hasło, kliknij poniższy link:\nhttp://reset.link\n\nLink jest ważny przez 10 godzin.\n\nPozdrawiamy,\nSecureBox',
      html: '\n      <h2>Witaj!</h2>\n      <p>Aby zresetować hasło, kliknij poniższy link:</p>\n      <a href="http://reset.link" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zresetuj hasło</a>\n      <p>Link jest ważny przez 10 godzin.</p>\n      <p>Pozdrawiamy,<br>SecureBox</p>\n    ',
    });
  });

  it('powinien rzucić błąd i zalogować go przy niepowodzeniu wysyłki', async () => {
    const error = new Error('Send mail failed');
    mockTransporter.sendMail.mockRejectedValue(error);
    await expect(sendResetEmail('user@example.com', 'http://reset.link')).rejects.toThrow('Nie udało się wysłać e-maila resetującego hasło');
    expect(console.error).toHaveBeenCalledWith('Błąd podczas wysyłania e-maila:', error);
  });

  it('powinien obsłużyć brak zmiennych środowiskowych', async () => {
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    mockTransporter.sendMail.mockResolvedValue({ messageId: '12345' });
    await sendResetEmail('user@example.com', 'http://reset.link');
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: undefined,
      port: 587,
      secure: false,
      auth: {
        user: undefined,
        pass: undefined,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  });
});