const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { getUserById } = require('../config/db/queries/users');

jest.mock('../config/db/queries/users');

describe('authenticateToken', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SECRET_KEY = 'test-secret';
    mockReq = { cookies: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.spyOn(jwt, 'verify').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('powinien zwrócić 401 gdy brak tokenu', async () => {
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ detail: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('powinien ustawić req.user i wywołać next dla poprawnego tokenu', async () => {
    mockReq.cookies.token = 'valid-token';
    jwt.verify.mockReturnValue({ user_id: '123' });
    getUserById.mockResolvedValue([{ id: '123', firstName: 'Jan', lastName: 'Kowalski', login: 'jan@example.com', password: 'hashed' }]);
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockReq.user).toEqual({
      id: '123',
      firstName: 'Jan',
      lastName: 'Kowalski',
      login: 'jan@example.com',
      password: 'hashed',
    });
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('powinien zwrócić 401 gdy użytkownik nie istnieje', async () => {
    mockReq.cookies.token = 'valid-token';
    jwt.verify.mockReturnValue({ user_id: '123' });
    getUserById.mockResolvedValue([]);
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ detail: 'User not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('powinien zwrócić 401 dla przeterminowanego tokenu', async () => {
    mockReq.cookies.token = 'expired-token';
    jwt.verify.mockImplementation(() => {
      throw new jwt.TokenExpiredError('Token expired');
    });
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ detail: 'Token has expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('powinien zwrócić 401 dla niepoprawnego tokenu', async () => {
    mockReq.cookies.token = 'invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Invalid token');
    });
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ detail: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('powinien zwrócić 500 dla nieoczekiwanego błędu', async () => {
    mockReq.cookies.token = 'error-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ detail: 'Internal server error' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('powinien użyć poprawnego klucza SECRET_KEY', async () => {
    mockReq.cookies.token = 'valid-token';
    jwt.verify.mockReturnValue({ user_id: '123' });
    getUserById.mockResolvedValue([{ id: '123', firstName: 'Jan', lastName: 'Kowalski', login: 'jan@example.com', password: 'hashed' }]);
    await authenticateToken(mockReq, mockRes, mockNext);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
  });
});