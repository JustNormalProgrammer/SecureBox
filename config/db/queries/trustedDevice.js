const db = require("../drizzleDB");
const { trustedDevices } = require("../schema");
const { eq, and } = require("drizzle-orm");

/**
 * Pobiera listę zaufanych urządzeń użytkownika na podstawie jego ID.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby pobrać wszystkie urządzenia powiązane z danym użytkownikiem.
 *
 * @async
 * @function getTrustedDevicesByUserId
 * @param {string} userId - ID użytkownika, którego urządzenia chcesz pobrać.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę obiektów reprezentujących zaufane urządzenia użytkownika.
 */
async function getTrustedDevicesByUserId(userId) {
  const result = await db
    .select()
    .from(trustedDevices)
    .where(eq(trustedDevices.userId, userId));
  return result;
}

/**
 * Wstawia nowe urządzenie do tabeli zaufanych urządzeń lub aktualizuje je, jeśli już istnieje.
 * 
 * Ta funkcja zapisuje lub aktualizuje urządzenie powiązane z danym użytkownikiem. Jeżeli urządzenie już istnieje, dane są aktualizowane,
 * w przeciwnym razie tworzone jest nowe urządzenie w tabeli.
 *
 * @async
 * @function upsertTrustedDevice
 * @param {Object} deviceData - Dane urządzenia, które mają zostać zapisane lub zaktualizowane.
 * @param {string} deviceData.userId - ID użytkownika, któremu przypisane jest urządzenie.
 * @param {string} deviceData.deviceId - Unikalne ID urządzenia.
 * @param {string} deviceData.userAgent - User-Agent przeglądarki lub aplikacji, która korzysta z urządzenia.
 * @param {boolean} deviceData.isTrusted - Określa, czy urządzenie jest zaufane (`1` - zaufane, `0` - niezaufane).
 * @returns {Promise<void>} - Funkcja nie zwraca żadnej wartości.
 */
async function upsertTrustedDevice({ userId, deviceId, userAgent, isTrusted }) {
  const existingDevice = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceId, deviceId)
      )
    );
  if (existingDevice.length > 0) {
    await db
      .update(trustedDevices)
      .set({ userId, deviceId, userAgent, isTrusted })
      .where(
        and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceId, deviceId)
        )
      );
  } else {
    await db
      .insert(trustedDevices)
      .values({ userId, deviceId, userAgent, isTrusted });
  }
}

/**
 * Usuwa urządzenie z tabeli zaufanych urządzeń użytkownika.
 * 
 * Ta funkcja usuwa urządzenie powiązane z danym użytkownikiem i urządzeniem. Zwraca urządzenie, które zostało usunięte,
 * lub pustą tablicę, jeśli urządzenie nie istniało wcześniej w bazie danych.
 *
 * @async
 * @function deleteTrustedDevice
 * @param {Object} deviceData - Dane urządzenia, które ma zostać usunięte.
 * @param {string} deviceData.userId - ID użytkownika, który chce usunąć urządzenie.
 * @param {string} deviceData.deviceId - Unikalne ID urządzenia, które ma zostać usunięte.
 * @returns {Promise<Object[]>} - Zwraca `Promise` z tablicą zawierającą usunięte urządzenie lub pustą tablicę, jeśli urządzenie nie zostało znalezione.
 */
async function deleteTrustedDevice({ userId, deviceId }) {
  const result = await db
    .delete(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceId, deviceId)
      )
    )
    .returning();
  return result;
}

module.exports = {
  getTrustedDevicesByUserId,
  upsertTrustedDevice,
  deleteTrustedDevice,
};
