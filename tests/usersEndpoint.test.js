const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const userRoutes = require('../routes/users');
const { SECRET_KEY } = require('../middleware/auth');
const {
  getUserById,
  getUserByLogin,
  createUser,
  updateUser,
  deleteTrustedDevice,
  saveResetToken,
  verifyResetToken,
  deleteResetToken,
  getLoginEntriesByUserId,
  createLoginEntry,
  getTrustedDevicesByUserId,
  upsertTrustedDevice,
} = require('../config/db/queries/users');
const { sendResetEmail } = require('../utils/emailUtils');
const { generateResetToken } = require('../utils/tokenUtils');
const { validateRecaptcha } = require('../utils/captcha');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/users', userRoutes);


app.use((err, req, res, next) => {
  //console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});

jest.mock('../config/db/queries/users', () => ({
  getUserById: jest.fn(),
  getUserByLogin: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getLoginEntriesByUserId: jest.fn(),
  createLoginEntry: jest.fn(),
  getTrustedDevicesByUserId: jest.fn(),
  upsertTrustedDevice: jest.fn(),
  deleteTrustedDevice: jest.fn(),
  saveResetToken: jest.fn(),
  verifyResetToken: jest.fn(),
  deleteResetToken: jest.fn(),
}));
jest.mock('../utils/emailUtils');
jest.mock('../utils/tokenUtils');
jest.mock('../utils/fileHandler');
jest.mock('../utils/captcha', () => ({
  validateRecaptcha: jest.fn(),
}));

const generujToken = (uzytkownik) => {
  return jwt.sign(uzytkownik, SECRET_KEY, { expiresIn: '1h' });
};

const mockUzytkownik = {
  id: '123',
  firstName: 'Jan',
  lastName: 'Kowalski',
  login: 'jan@przyklad.pl',
};

describe('Testy Bezpieczeństwa Tras Użytkowników', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateRecaptcha.mockResolvedValue(true); 
    getUserById.mockResolvedValue([mockUzytkownik]); 
  });

  
  describe('POST /users/', () => {
    it('powinien utworzyć użytkownika z poprawnymi danymi', async () => {
      getUserByLogin.mockResolvedValue([]);
      createUser.mockResolvedValue('123');

      const res = await request(app)
        .post('/users')
        .send({
          first_name: 'Jan',
          last_name: 'Kowalski',
          login: 'jan@przyklad.pl',
          password: 'SilneHaslo123!',
          token: 'valid-recaptcha-token',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        id: '123',
        firstName: 'Jan',
        lastName: 'Kowalski',
        login: 'jan@przyklad.pl',
      });
      expect(validateRecaptcha).toHaveBeenCalledWith('valid-recaptcha-token');
    });

    it('powinien odrzucić nieprawidłowy format emaila', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          first_name: 'Jan',
          last_name: 'Kowalski',
          login: 'niepoprawny-email',
          password: 'SilneHaslo123!',
          token: 'valid-recaptcha-token',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('Login must be a valid email adress');
    });

    it('powinien odrzucić słabe hasło', async () => {
      const res = await request(app)
        .post('/users')
        .send({
          first_name: 'Jan',
          last_name: 'Kowalski',
          login: 'jan@przyklad.pl',
          password: 'slabe',
          token: 'valid-recaptcha-token',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain(
        'Password field must be at least 8 characters long, contain at least one lowercase letter, uppercase letter, number and a symbol'
      );
    });

    it('powinien zapobiec duplikacji loginu', async () => {
      getUserByLogin.mockResolvedValue([{ id: '123', login: 'jan@przyklad.pl' }]);

      const res = await request(app)
        .post('/users')
        .send({
          first_name: 'Jan',
          last_name: 'Kowalski',
          login: 'jan@przyklad.pl',
          password: 'SilneHaslo123!',
          token: 'valid-recaptcha-token',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Login already exists');
    });

    it('powinien chronić przed XSS w danych wejściowych', async () => {
      getUserByLogin.mockResolvedValue([]);

      const res = await request(app)
        .post('/users')
        .send({
          first_name: '<script>alert("xss")</script>',
          last_name: 'Kowalski',
          login: 'jan@przyklad.pl',
          password: 'SilneHaslo123!',
          token: 'valid-recaptcha-token',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain(
        "First name must contain only letters except for space, - and ' characters"
      );
    });

    it('powinien odrzucić nieprawidłowy token reCAPTCHA', async () => {
      validateRecaptcha.mockResolvedValue(false);

      const res = await request(app)
        .post('/users')
        .send({
          first_name: 'Jan',
          last_name: 'Kowalski',
          login: 'jan@przyklad.pl',
          password: 'SilneHaslo123!',
          token: 'invalid-recaptcha-token',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid reCAPTCHA');
    });
  });


  describe('PATCH /users/:user_id', () => {
    it('powinien zaktualizować użytkownika z poprawnym tokenem i danymi', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([mockUzytkownik]);
      updateUser.mockResolvedValue();

      const res = await request(app)
        .patch('/users/123')
        .set('Cookie', `token=${token}`)
        .send({
          first_name: 'Anna',
          last_name: 'Kowalska',
          password: 'NoweHaslo123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: '123',
        first_name: 'Jan',
        last_name: 'Kowalski',
        login: 'jan@przyklad.pl',
      });
    });

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .patch('/users/456')
        .set('Cookie', `token=${token}`)
        .send({
          first_name: 'Anna',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien odrzucić nieprawidłowy format hasła', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([mockUzytkownik]);

      const res = await request(app)
        .patch('/users/123')
        .set('Cookie', `token=${token}`)
        .send({
          password: 'slabe',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain(
        'Password field must be at least 8 characters long, contain at least one lowercase letter, uppercase letter, number and a symbol'
      );
    });

    it('powinien obsłużyć nieistniejącego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([]);

      const res = await request(app)
        .patch('/users/123')
        .set('Cookie', `token=${token}`)
        .send({
          first_name: 'Anna',
        });

      expect(res.statusCode).toBe(401); 
      expect(res.body.detail).toBe('User not found');
    });
  });

 
  describe('GET /users/:user_id', () => {
    it('powinien zwrócić dane użytkownika z poprawnym tokenem', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([mockUzytkownik]);

      const res = await request(app)
        .get('/users/123')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: '123',
        first_name: 'Jan',
        last_name: 'Kowalski',
        login: 'jan@przyklad.pl',
      });
    });

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .get('/users/456')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien obsłużyć nieistniejącego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([]);

      const res = await request(app)
        .get('/users/123')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(401); 
      expect(res.body.detail).toBe('User not found');
    });
  });

  
  describe('GET /users/me/get', () => {
    it('powinien zwrócić dane użytkownika z poprawnym tokenem', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([mockUzytkownik]);

      const res = await request(app)
        .get('/users/me/get')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(mockUzytkownik);
    });

    it('powinien odrzucić brak tokena', async () => {
      const res = await request(app).get('/users/me/get');

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('No token provided');
    });

    it('powinien odrzucić nieprawidłowy token', async () => {
      const res = await request(app)
        .get('/users/me/get')
        .set('Cookie', `token=nieprawidlowy-token`);

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Invalid token');
    });
  });


  describe('GET /users/:user_id/logins', () => {

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });
      getUserById.mockResolvedValue([{ ...mockUzytkownik, id: '456' }]);

      const res = await request(app)
        .get('/users/123/logins')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien obsłużyć nieistniejącego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([]);

      const res = await request(app)
        .get('/users/123/logins')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(401); 
      expect(res.body.detail).toBe('User not found');
    });
  });

 
  describe('POST /users/:user_id/logins', () => {
    it('powinien odrzucić nieprawidłowy format loginu', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([mockUzytkownik]);

      const res = await request(app)
        .post('/users/123/logins')
        .set('Cookie', `token=${token}`)
        .send({
          login: 'niepoprawny-email',
          page: 'panel',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain('Login must be a valid email adress');
    });

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });
      getUserById.mockResolvedValue([{ ...mockUzytkownik, id: '456' }]);

      const res = await request(app)
        .post('/users/123/logins')
        .set('Cookie', `token=${token}`)
        .send({
          login: 'jan@przyklad.pl',
          page: 'panel',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien obsłużyć nieistniejącego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([]);

      const res = await request(app)
        .post('/users/123/logins')
        .set('Cookie', `token=${token}`)
        .send({
          login: 'jan@przyklad.pl',
          page: 'panel',
        });

      expect(res.statusCode).toBe(401); 
      expect(res.body.detail).toBe('User not found');
    });
  });

 
  describe('GET /users/:user_id/trusted-devices', () => {

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });
      getUserById.mockResolvedValue([{ ...mockUzytkownik, id: '456' }]);

      const res = await request(app)
        .get('/users/123/trusted-devices')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

    it('powinien obsłużyć nieistniejącego użytkownika', async () => {
      const token = generujToken(mockUzytkownik);
      getUserById.mockResolvedValue([]);

      const res = await request(app)
        .get('/users/123/trusted-devices')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(401); 
      expect(res.body.detail).toBe('User not found');
    });
  });

  
  describe('PATCH /users/:user_id/trusted-devices', () => {

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken(mockUzytkownik);

      const res = await request(app)
        .patch('/users/456/trusted-devices')
        .set('Cookie', `token=${token}`)
        .send({
          device_id: 'device1',
          user_agent: 'Mozilla',
          is_trusted: true,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });
  });

  
  describe('DELETE /users/:user_id/trusted-devices/:device_id', () => {

    it('powinien odrzucić nieautoryzowane ID użytkownika', async () => {
      const token = generujToken({ ...mockUzytkownik, id: '456' });
      getUserById.mockResolvedValue([{ ...mockUzytkownik, id: '456' }]);

      const res = await request(app)
        .delete('/users/123/trusted-devices/device1')
        .set('Cookie', `token=${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.detail).toBe('Forbidden');
    });

  });


  describe('POST /users/reset-password', () => {
    it('powinien wysłać email resetujący dla istniejącego użytkownika', async () => {
      getUserByLogin.mockResolvedValue([{ id: '123', login: 'jan@przyklad.pl' }]);
      generateResetToken.mockReturnValue('token-reset');
      saveResetToken.mockResolvedValue();
      sendResetEmail.mockResolvedValue();

      const res = await request(app)
        .post('/users/reset-password')
        .send({ login: 'jan@przyklad.pl', token: 'valid-recaptcha-token' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Jeśli login istnieje, link resetujący został wysłany');
      expect(sendResetEmail).toHaveBeenCalled();
      expect(validateRecaptcha).toHaveBeenCalledWith('valid-recaptcha-token');
    });

    it('powinien obsłużyć nieistniejącego użytkownika bez ujawniania informacji', async () => {
      getUserByLogin.mockResolvedValue([]);

      const res = await request(app)
        .post('/users/reset-password')
        .send({ login: 'nieistnieje@przyklad.pl', token: 'valid-recaptcha-token' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Jeśli login istnieje, link resetujący został wysłany');
      expect(sendResetEmail).not.toHaveBeenCalled();
    });

    it('powinien odrzucić brak loginu', async () => {
      const res = await request(app)
        .post('/users/reset-password')
        .send({ token: 'valid-recaptcha-token' });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Login jest wymagany');
    });
  });


  describe('POST /users/reset-password/confirm', () => {
    it('powinien zresetować hasło z poprawnym tokenem', async () => {
      verifyResetToken.mockResolvedValue({ id: '123' });
      updateUser.mockResolvedValue();
      deleteResetToken.mockResolvedValue();

      const res = await request(app)
        .post('/users/reset-password/confirm')
        .send({
          resetToken: 'poprawny-token',
          newPassword: 'NoweHaslo123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Hasło zostało pomyślnie zmienione');
    });

    it('powinien odrzucić nieprawidłowy token resetu', async () => {
      verifyResetToken.mockResolvedValue(null);

      const res = await request(app)
        .post('/users/reset-password/confirm')
        .send({
          resetToken: 'niepoprawny-token',
          newPassword: 'NoweHaslo123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Nieprawidłowy lub wygasły token resetu');
    });

    it('powinien odrzucić brak tokenu lub hasła', async () => {
      const res = await request(app)
        .post('/users/reset-password/confirm')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Token resetu i nowe hasło są wymagane');
    });

    it('powinien odrzucić słabe hasło', async () => {
      verifyResetToken.mockResolvedValue({ id: '123' });

      const res = await request(app)
        .post('/users/reset-password/confirm')
        .send({
          resetToken: 'poprawny-token',
          newPassword: 'slabe',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toContain(
        'Password field must be at least 8 characters long, contain at least one lowercase letter, uppercase letter, number and a symbol'
      );
    });
  });
});