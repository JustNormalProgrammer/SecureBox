const { getPasswordByUserId, createPassword, getPasswordByUserPlatformLogin, deletePassword } = require('../config/db/queries/password');
const db = require('../config/db/drizzleDB');
const { passwords } = require('../config/db/schema');
const { eq, and } = require('drizzle-orm');



jest.mock('../config/db/drizzleDB');



describe('Zapytania o hasła', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pobieranie haseł po userId', () => {
    it('Zwraca hasła dla danego userId', async () => {
      const userId = 'user-123';
      const mockPasswords = [
        { id: 'uuid-123', userId, logo: 'logo.png', platform: 'example', login: 'test@example.com' },
      ];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockPasswords),
        }),
      });

      const result = await getPasswordByUserId(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockPasswords);
    });
  });

  describe('Tworzenie hasła', () => {
    it('Tworzy nowe hasło i zwraca jego id', async () => {
      const passwordData = {
        logo: 'logo.png',
        platform: 'example',
        login: 'test@example.com',
        userId: 'user-123',
      };

      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await createPassword(passwordData);
      const idd =db.insert().values.mock.calls[0][0].id;
      expect(idd).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(db.insert().values.mock.calls[0][0]).toEqual({
        id: idd,
        ...passwordData,
      });

      expect(result).toEqual(idd);
    });
  });

  describe('Usuwanie hasła', () => {
    it('Usuwa hasło i zwraca usunięty rekord', async () => {
      const userId = 'user-123';
      const platform = 'example';
      const login = 'test@example.com';
      const mockDeleted = [{ id: 'uuid-123', userId, platform, login }];

      db.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockDeleted),
        }),
      });

      const result = await deletePassword(userId, platform, login);

      expect(db.delete).toHaveBeenCalledWith(passwords);
      expect(db.delete().where).toHaveBeenCalledWith(
        and(
          eq(passwords.userId, userId),
          eq(passwords.platform, platform),
          eq(passwords.login, login)
        )
      );
      expect(result).toEqual(mockDeleted);
    });
  });
});