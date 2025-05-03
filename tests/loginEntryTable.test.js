const { getLoginEntriesByUserId, createLoginEntry } = require('../config/db/queries/loginEntry');
const db = require('../config/db/drizzleDB');
const { loginEntries } = require('../config/db/schema');
const { eq } = require('drizzle-orm');

jest.mock('../config/db/drizzleDB');

describe('Zapytania o wpisy logowania', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pobieranie wpisów logowania po userId', () => {
    it('Zwraca wpisy logowania dla danego userId', async () => {
      const userId = 'user-123';
      const mockEntries = [
        { id: 1, userId, login: 'test@example.com', page: 'dashboard', timestamp: '2023-01-01T00:00:00Z' },
      ];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockEntries),
        }),
      });

      const result = await getLoginEntriesByUserId(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockEntries);
      expect(db.select().from).toHaveBeenCalledWith(loginEntries);
      expect(db.select().from().where).toHaveBeenCalledWith(eq(loginEntries.userId, userId));
    });

    it('Zwraca pustą tablicę, jeśli nie ma wpisów', async () => {
      const userId = 'user-123';

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await getLoginEntriesByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('Tworzenie wpisu logowania', () => {
    it('Tworzy nowy wpis logowania i zwraca go', async () => {
      const entryData = {
        userId: 'user-123',
        login: 'test@example.com',
        page: 'dashboard',
      };
      const mockResult = [{ ...entryData, timestamp: expect.any(String) }];

      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockResult),
        }),
      });

      const result = await createLoginEntry(entryData);

      expect(db.insert).toHaveBeenCalledWith(loginEntries);
      expect(db.insert().values).toHaveBeenCalledWith({
        ...entryData,
        timestamp: expect.any(String),
      });
      expect(result).toEqual(mockResult);
    });
  });
});