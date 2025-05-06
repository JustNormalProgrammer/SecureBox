const db = require("../drizzleDB");
const { passwords } = require("../schema");
const { eq, and } = require("drizzle-orm");

/**
 * Pobiera hasła użytkownika na podstawie jego ID.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby pobrać wszystkie hasła powiązane z danym użytkownikiem.
 *
 * @async
 * @function getPasswordByUserId
 * @param {string} userId - ID użytkownika, dla którego chcesz pobrać hasła.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę obiektów reprezentujących hasła użytkownika.
 */
async function getPasswordByUserId(userId) {
  const result = await db
    .select()
    .from(passwords)
    .where(eq(passwords.userId, userId));
  return result;
}

/**
 * Tworzy nowe hasło w bazie danych.
 * 
 * Ta funkcja zapisuje nowe hasło użytkownika w tabeli `passwords`, w tym zapisuje plik hasła, logo, platformę, login oraz ID użytkownika.
 *
 * @async
 * @function createPassword
 * @param {Object} passwordData - Dane wejściowe dla nowego hasła.
 * @param {string} passwordData.passwordfile - Nazwa pliku zawierającego hasło.
 * @param {string} passwordData.logo - URL logo platformy.
 * @param {string} passwordData.platform - Platforma, dla której zapisane jest hasło.
 * @param {string} passwordData.login - Login użytkownika na platformie.
 * @param {string} passwordData.userId - ID użytkownika, dla którego zapisane jest hasło.
 * @returns {Promise<string>} - Zwraca `Promise` z ID nowo utworzonego hasła.
 */
async function createPassword({ logo, platform, login, userId }) {
  const id = crypto.randomUUID();
  await db
    .insert(passwords)
    .values({ id, logo, platform, login, userId });
  return id;
}

/**
 * Pobiera hasło użytkownika na podstawie jego ID, platformy i loginu.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby pobrać hasło powiązane z danym użytkownikiem, platformą oraz loginem.
 *
 * @async
 * @function getPasswordByUserPlatformLogin
 * @param {string} userId - ID użytkownika, dla którego chcesz pobrać hasło.
 * @param {string} platform - Platforma, z której pochodzi login.
 * @param {string} login - Login użytkownika na platformie.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę obiektów reprezentujących hasła pasujące do danych wejściowych.
 */
async function getPasswordByUserPlatformLogin(userId, platform, login) {
  const result = await db
    .select()
    .from(passwords)
    .where(
      and(
        eq(passwords.userId, userId),
        eq(passwords.platform, platform),
        eq(passwords.login, login)
      )
    );
  return result;
}

/**
 * Usuwa hasło użytkownika na podstawie jego ID, platformy i loginu.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby usunąć hasło powiązane z danym użytkownikiem, platformą oraz loginem.
 *
 * @async
 * @function deletePassword
 * @param {string} userId - ID użytkownika, którego hasło ma zostać usunięte.
 * @param {string} platform - Platforma, z której pochodzi login.
 * @param {string} login - Login użytkownika na platformie.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający usunięte wpisy.
 */
async function deletePassword(userId, platform, login) {
  const result = await db
    .delete(passwords)
    .where(
      and(
        eq(passwords.userId, userId),
        eq(passwords.platform, platform),
        eq(passwords.login, login)
      )
    )
    .returning();
  return result;
}

module.exports = {
  getPasswordByUserId,
  createPassword,
  getPasswordByUserPlatformLogin,
  deletePassword,
};
