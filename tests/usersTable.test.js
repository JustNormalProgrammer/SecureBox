const crypto = require('crypto');
const {
  getUserById,
  createUser,
  getUserByLoginAndPassword,
  canUserLogin,
  getUserByLogin,
  recordLoginAttempt,
  saveResetToken,
  deleteResetToken,
  verifyResetToken,
} = require('../config/db/queries/users');
const db = require('../config/db/drizzleDB');
const { users, loginAttempts, passwordResetTokens } = require('../config/db/schema');


jest.mock('../config/db/drizzleDB', () => {
  const mockLimit = jest.fn().mockResolvedValue([]);
  const mockWhere = jest.fn(() => ({ limit: mockLimit }));
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  const mockSelect = jest.fn(() => ({ from: mockFrom }));
  const mockSet = jest.fn();
  const mockValues = jest.fn().mockResolvedValue(undefined);
  const mockInsert = jest.fn(() => ({ values: mockValues }));
  const mockUpdate = jest.fn(() => ({ set: mockSet }));
  const mockReturning = jest.fn().mockResolvedValue([]);
  const mockDelete = jest.fn(() => ({
    where: jest.fn(() => ({ returning: mockReturning })),
  }));

  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('uuid-123'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('hashed-password'),
    }),
  }),
}));

describe('Zapytania o użytkowników', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pobieranie użytkownika po id', () => {
    it('Zwraca użytkownika dla danego id', async () => {
      const userId = 'uuid-123';
      const mockUser = [{
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        login: 'john@example.com',
        password: 'hashed-password',
      }];

      const mockLimit = jest.fn().mockResolvedValue(mockUser);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await getUserById(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('Zwraca pustą tablicę, jeśli użytkownik nie istnieje', async () => {
      const userId = 'non-existent-uuid';

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await getUserById(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('Tworzenie użytkownika', () => {
    it('Tworzy nowego użytkownika i zwraca jego id', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        login: 'john@example.com',
        password: 'password123',
      };

      const mockValues = jest.fn().mockResolvedValue(undefined);
      db.insert.mockReturnValue({ values: mockValues });

      const result = await createUser(userData);

      expect(db.insert).toHaveBeenCalledWith(users);
      const insertedData = mockValues.mock.calls[0][0];
      expect(insertedData.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(insertedData.password).toMatch(/^[a-f0-9]{64}$/i);
      expect(mockValues).toHaveBeenCalledWith(insertedData);
      expect(result).toEqual(insertedData.id);
    });
  });

  describe('Sprawdzanie możliwości logowania', () => {
    it('Pozwala na logowanie, jeśli mniej niż 5 nieudanych prób', async () => {
      const userId = 'uuid-123';
      const mockAttempts = [
        {
          id: 'attempt-1',
          userId,
          success: false,
          timestamp: new Date().toISOString(),
        },
      ];

      const mockWhere = jest.fn().mockResolvedValue(mockAttempts);
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await canUserLogin(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual({ canLogin: true });
    });

    it('Blokuje logowanie, jeśli 5 lub więcej nieudanych prób w ciągu 10 minut', async () => {
      const userId = 'uuid-123';
      const now = new Date();
      const mockAttempts = Array.from({ length: 5 }, (_, i) => ({
        id: `attempt-${i}`,
        userId,
        success: false,
        timestamp: now.toISOString(),
      }));

      const mockWhere = jest.fn().mockResolvedValue(mockAttempts);
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await canUserLogin(userId);

      expect(result.canLogin).toBe(false);
      expect(result.lockoutUntil).toBeInstanceOf(Date);
    });
  });

  describe('Pobieranie użytkownika po loginie i haśle', () => {
    it('Zwraca null, jeśli hasło jest niepoprawne', async () => {
      const login = 'john@example.com';
      const password = 'wrong-password';
      const mockUser = {
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        login,
        password: 'hashed-password',
      };

      const mockLimitAttempts = jest.fn().mockResolvedValue([]);
      const mockWhereAttempts = jest.fn(() => ({ limit: mockLimitAttempts }));
      const mockFromAttempts = jest.fn(() => ({ where: mockWhereAttempts }));

      const mockLimitUser = jest.fn().mockResolvedValue([mockUser]);
      const mockWhereUser = jest.fn(() => ({ limit: mockLimitUser }));
      const mockFromUser = jest.fn(() => ({ where: mockWhereUser }));

      db.select
        .mockReturnValueOnce({ from: mockFromAttempts })
        .mockReturnValue({ from: mockFromUser });      

      const mockValues = jest.fn().mockResolvedValue(undefined);
      db.insert.mockReturnValue({ values: mockValues });

      
      crypto.createHash().update().digest.mockReturnValueOnce('wrong-hashed-password');

      const result = await getUserByLoginAndPassword(login, password);

      expect(result).toBe(null);
    });
  });


  describe('Pobieranie użytkownika po loginie', () => {
    it('Zwraca użytkownika dla danego loginu', async () => {
      const login = 'john@example.com';
      const mockUser = [{
        id: 'uuid-123',
        firstName: 'John',
        lastName: 'Doe',
        login,
        password: 'hashed-password',
      }];

      const mockLimit = jest.fn().mockResolvedValue(mockUser);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await getUserByLogin(login);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('Zwraca pustą tablicę, jeśli login nie istnieje', async () => {
      const login = 'nonexistent@example.com';

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await getUserByLogin(login);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('Zapisywanie próby logowania', () => {
    it('Zapisuje próbę logowania z sukcesem', async () => {
      const userId = 'uuid-123';
      const success = true;

      const mockValues = jest.fn().mockResolvedValue(undefined);
      db.insert.mockReturnValue({ values: mockValues });

      await recordLoginAttempt(userId, success);

      expect(db.insert).toHaveBeenCalledWith(loginAttempts);
      const idd = db.insert().values.mock.calls[0][0].id;
      expect(idd).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      const timestamp = db.insert().values.mock.calls[0][0].timestamp;
      expect(mockValues).toHaveBeenCalledWith({
        id: idd, 
        userId,
        timestamp: timestamp,
        success,
      });
    });

    it('Zapisuje nieudaną próbę logowania', async () => {
      const userId = 'uuid-123';
      const success = false;

      const mockValues = jest.fn().mockResolvedValue(undefined);
      db.insert.mockReturnValue({ values

: mockValues });

      await recordLoginAttempt(userId, success);

      expect(db.insert).toHaveBeenCalledWith(loginAttempts);
      const idd = db.insert().values.mock.calls[0][0].id;
      expect(idd).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      const timestamp = db.insert().values.mock.calls[0][0].timestamp;
      expect(mockValues).toHaveBeenCalledWith({
        id: idd,
        userId,
        timestamp: timestamp,
        success,
      });
    });
  });

  describe('Zapisywanie tokenu resetowania hasła', () => {
    it('Zapisuje nowy token resetowania i usuwa istniejące', async () => {
      const userId = 'uuid-123';
      const resetToken = 'reset-token-123';

      const mockValues = jest.fn().mockResolvedValue(undefined);
      db.insert.mockReturnValue({ values: mockValues });

      const mockReturning = jest.fn().mockResolvedValue([]);
      db.delete.mockReturnValue({ where: jest.fn(() => ({ returning: mockReturning })) });

      const result = await saveResetToken(userId, resetToken);

      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalledWith(passwordResetTokens);
      const idd = db.insert().values.mock.calls[0][0].id;
      expect(idd).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      const expiresAt = db.insert().values.mock.calls[0][0].expiresAt;
      expect(mockValues).toHaveBeenCalledWith({
        id: idd,
        userId,
        token: resetToken,
        expiresAt: expiresAt,
      });
      expect(result).toEqual({
        id: idd,
        userId,
        token: resetToken,
        expiresAt: expiresAt,
      });
    });
  });

  describe('Usuwanie tokenu resetowania hasła', () => {
    it('Usuwa token i zwraca true, jeśli token istniał', async () => {
      const resetToken = 'reset-token-123';

      const mockReturning = jest.fn().mockResolvedValue([{ id: 'uuid-123' }]);
      db.delete.mockReturnValue({ where: jest.fn(() => ({ returning: mockReturning })) });

      const result = await deleteResetToken(resetToken);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('Zwraca false, jeśli token nie istniał', async () => {
      const resetToken = 'non-existent-token';

      const mockReturning = jest.fn().mockResolvedValue([]);
      db.delete.mockReturnValue({ where: jest.fn(() => ({ returning: mockReturning })) });

      const result = await deleteResetToken(resetToken);

      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('Weryfikacja tokenu resetowania hasła', () => {
    it('Zwraca użytkownika dla ważnego tokenu', async () => {
      const resetToken = 'reset-token-123';
      const userId = 'uuid-123';
      const mockToken = [{
        id: 'token-uuid',
        userId,
        token: resetToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), 
      }];
      const mockUser = [{
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        login: 'john@example.com',
        password: 'hashed-password',
      }];

      const mockLimitToken = jest.fn().mockResolvedValue(mockToken);
      const mockWhereToken = jest.fn(() => ({ limit: mockLimitToken }));
      const mockFromToken = jest.fn(() => ({ where: mockWhereToken }));

      const mockLimitUser = jest.fn().mockResolvedValue(mockUser);
      const mockWhereUser = jest.fn(() => ({ limit: mockLimitUser }));
      const mockFromUser = jest.fn(() => ({ where: mockWhereUser }));

      db.select
        .mockReturnValueOnce({ from: mockFromToken }) 
        .mockReturnValueOnce({ from: mockFromUser }); 

      const result = await verifyResetToken(resetToken);

      expect(db.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUser[0]);
    });

    it('Zwraca null, jeśli token jest nieważny', async () => {
      const resetToken = 'reset-token-123';
      const mockToken = [{
        id: 'token-uuid',
        userId: 'uuid-123',
        token: resetToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), 
      }];

      const mockLimit = jest.fn().mockResolvedValue(mockToken);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await verifyResetToken(resetToken);

      expect(db.select).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('Zwraca null, jeśli token nie istnieje', async () => {
      const resetToken = 'non-existent-token';

      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      db.select.mockReturnValue({ from: mockFrom });

      const result = await verifyResetToken(resetToken);

      expect(db.select).toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });
});