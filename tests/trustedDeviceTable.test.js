const { getTrustedDevicesByUserId, upsertTrustedDevice, deleteTrustedDevice } = require('../config/db/queries/trustedDevice');
const db = require('../config/db/drizzleDB');
const { trustedDevices } = require('../config/db/schema');
const { eq, and } = require('drizzle-orm');

jest.mock('../config/db/drizzleDB');

describe('Zapytania o zaufane urządzenia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pobieranie zaufanych urządzeń po userId', () => {
    it('Zwraca zaufane urządzenia dla danego userId', async () => {
      const userId = 'user-123';
      const mockDevices = [
        { userId, deviceId: 'device-123', userAgent: 'Mozilla/5.0', isTrusted: 1 },
      ];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockDevices),
        }),
      });

      const result = await getTrustedDevicesByUserId(userId);

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockDevices);
    });
  });

  describe('Aktualizacja lub wstawianie zaufanego urządzenia', () => {
    it('Wstawia nowe zaufane urządzenie, jeśli nie istnieje', async () => {
      const deviceData = {
        userId: 'user-123',
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
        isTrusted: 1,
      };

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      db.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      await upsertTrustedDevice(deviceData);

      expect(db.select).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalledWith(trustedDevices);
      expect(db.insert().values).toHaveBeenCalledWith(deviceData);
    });

    it('Aktualizuje istniejące zaufane urządzenie', async () => {
      const deviceData = {
        userId: 'user-123',
        deviceId: 'device-123',
        userAgent: 'Mozilla/5.0',
        isTrusted: 1,
      };
      const existingDevice = [deviceData];

      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(existingDevice),
        }),
      });
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await upsertTrustedDevice(deviceData);

      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalledWith(trustedDevices);
      expect(db.update().set).toHaveBeenCalledWith(deviceData);
    });
  });
});