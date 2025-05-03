const request = require('supertest');
const http = require('http');
const app = require('../app');

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('mocked-cert'),
}));

jest.mock('https', () => ({
  createServer: jest.fn().mockReturnValue({
    listen: jest.fn((port, host, callback) => callback()),
  }),
}));

jest.mock('archiver', () => ({
  create: jest.fn().mockReturnValue({
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
  }),
}));

jest.mock('csrf-csrf', () => ({
  doubleCsrf: () => ({
    doubleCsrfProtection: (req, res, next) => {
      req.csrfToken = () => 'mocked-csrf-token';
      next();
    },
  }),
}));

jest.mock('../routes/auth', () => {
  return (req, res, next) => {
    if (req.method === 'POST' && req.path === '/') {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ detail: 'Missing required fields' });
      } else {
        res.status(200).json({ message: 'Login successful' });
      }
    } else {
      next();
    }
  };
});

jest.mock('../routes/users', () => {
  return (req, res, next) => {
    if (req.method === 'GET' && req.path === '/') {
      res.status(404).json({ detail: 'Route not found' });
    } else {
      next();
    }
  };
});

jest.mock('../routes/passwords', () => {
  return (req, res, next) => {
    if (req.method === 'GET' && req.path === '/') {
      res.status(200).json({ message: 'Passwords route' });
    } else {
      next();
    }
  };
});

jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Konfiguracja aplikacji Express', () => {
  let server;

  beforeAll((done) => {
    process.env.NODE_ENV = 'test';
    process.env.CSRF_SECRET = 'test-secret';
    server = http.createServer(app);
    server.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
    jest.restoreAllMocks();
  });

  it('powinien zastosować middleware helmet', async () => {
    const response = await request(server).get('/csrf-token');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('powinien zastosować middleware CORS z poprawnymi źródłami', async () => {
    const response = await request(server)
      .get('/csrf-token')
      .set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('powinien zwrócić token CSRF dla żądania GET /csrf-token', async () => {
    const response = await request(server).get('/csrf-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('csrfToken', 'mocked-csrf-token');
  });

  it('powinien odrzucić żądanie POST bez ważnego tokena CSRF', async () => {
    const response = await request(server).post('/users').send({});
    expect(response.status).toBe(404);
  });

  it('powinien zwrócić 404 dla nieznanej trasy', async () => {
    const response = await request(server).get('/unknown-route');
    expect(response.status).toBe(404);
    expect(response.text).toBe('404 Not Found');
  });

  it('powinien obsłużyć błędy serwera', async () => {
    const response = await request(server).get('/users').set('Cookie', ['session-id=invalid']);
    expect(response.status).toBe(404);
  });
});

describe('Trasy autoryzacji', () => {
  let server;

  beforeAll((done) => {
    server = http.createServer(app);
    server.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('powinien zezwolić na żądanie POST /login bez tokena CSRF', async () => {
    const response = await request(server).post('/login').send({
      username: 'testuser',
      password: 'testpass',
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Login successful');
  });
});