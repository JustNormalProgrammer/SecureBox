const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/auth');
const { getUserByLoginAndPassword } = require('../config/db/queries/users');
const { validateRecaptcha } = require('../utils/captcha');
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/login', authRoutes);


app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});


jest.mock('../config/db/queries/users', () => ({
  getUserByLoginAndPassword: jest.fn(),
}));

jest.mock('../utils/captcha', () => ({
  validateRecaptcha: jest.fn(),
}));

describe('POST /login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateRecaptcha.mockResolvedValue(true); 
  });

  it('powinien zwrócić ciasteczko z tokenem i dane użytkownika dla poprawnego logowania', async () => {
    const mockUser = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      login: 'johndoe',
    };
    getUserByLoginAndPassword.mockResolvedValue([mockUser]);

    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: 'secret', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        login: 'johndoe',
      },
      token: 1, 
    });

  
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=/);

    
    const tokenMatch = setCookie[0].match(/token=([^;]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    expect(decodedToken).toHaveProperty('user_id', mockUser.id);

    
    const expectedExpiration = TOKEN_EXPIRATION_MINUTES * 60;
    expect(decodedToken.exp - decodedToken.iat).toBeCloseTo(expectedExpiration, -1);


    expect(setCookie[0]).toMatch(/HttpOnly/);
    expect(setCookie[0]).toMatch(/SameSite=Strict/);
    expect(setCookie[0]).toMatch(new RegExp(`Max-Age=${TOKEN_EXPIRATION_MINUTES * 60}`));
    if (process.env.NODE_ENV === 'production') {
      expect(setCookie[0]).toMatch(/Secure/);
    }
  });

  it('powinien zwrócić 401 dla nieprawidłowego loginu lub hasła', async () => {
    getUserByLoginAndPassword.mockResolvedValue([]);

    const response = await request(app)
      .post('/login')
      .send({ login: 'wrong', password: 'wrong', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ detail: 'Invalid login or password' });
  });

  it('powinien zwrócić 401 dla nieprawidłowego tokenu reCAPTCHA', async () => {
    validateRecaptcha.mockResolvedValue(false);
    const mockUser = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      login: 'johndoe',
    };
    getUserByLoginAndPassword.mockResolvedValue([mockUser]);

    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: 'secret', token2: 'invalid-recaptcha-token' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ detail: 'Invalid' });
  });

  it('powinien zwrócić 400 dla brakującego loginu', async () => {
    const response = await request(app)
      .post('/login')
      .send({ password: 'secret', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(400); 
    expect(response.body).toHaveProperty('detail');
  });

  it('powinien zwrócić 400 dla brakującego hasła', async () => {
    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(400); 
    expect(response.body).toHaveProperty('detail');
  });

  it('powinien zwrócić 400 dla brakującego tokenu reCAPTCHA', async () => {
    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: 'secret' });

    expect(response.statusCode).toBe(400); 
    expect(response.body).toHaveProperty('detail');
  });

  it('powinien zwrócić 400 dla pustego loginu', async () => {
    const response = await request(app)
      .post('/login')
      .send({ login: '', password: 'secret', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(400); 
    expect(response.body).toHaveProperty('detail');
  });

  it('powinien zwrócić 400 dla pustego hasła', async () => {
    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: '', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(400); 
    expect(response.body).toHaveProperty('detail');
  });

  it('powinien obsłużyć bardzo długie dane wejściowe', async () => {
    const longString = 'a'.repeat(1000);
    getUserByLoginAndPassword.mockResolvedValue([]);

    const response = await request(app)
      .post('/login')
      .send({ login: longString, password: longString, token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ detail: 'Invalid login or password' });
  });

  it('powinien zwrócić 500 dla błędu bazy danych', async () => {
    getUserByLoginAndPassword.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: 'secret', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ detail: 'Database error' });
  });

  it('powinien zwrócić 500 dla błędu walidacji reCAPTCHA', async () => {
    validateRecaptcha.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/login')
      .send({ login: 'johndoe', password: 'secret', token2: 'valid-recaptcha-token' });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ detail: 'Database error' });
  });
});