const db = require("../drizzleDB");
const { loginEntries } = require("../schema");
const { eq } = require("drizzle-orm");

/**
 * Pobiera wpisy logowania użytkownika na podstawie jego ID.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby pobrać wszystkie wpisy logowania powiązane z danym użytkownikiem.
 *
 * @async
 * @function getLoginEntriesByUserId
 * @param {string} userId - ID użytkownika, dla którego chcesz pobrać wpisy logowania.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę obiektów reprezentujących wpisy logowania użytkownika.
 */
async function getLoginEntriesByUserId(userId) {
  const result = await db
    .select()
    .from(loginEntries)
    .where(eq(loginEntries.userId, userId));
  return result;
}

/**
 * Tworzy nowy wpis logowania w bazie danych.
 * 
 * Ta funkcja zapisuje nowy wpis logowania użytkownika w tabeli `loginEntries`, zapisując ID użytkownika, login, stronę oraz znacznik czasowy.
 *
 * @async
 * @function createLoginEntry
 * @param {Object} entryData - Dane wejściowe dla nowego wpisu logowania.
 * @param {string} entryData.userId - ID użytkownika, który loguje się.
 * @param {string} entryData.login - Login użytkownika, który się loguje.
 * @param {string} entryData.page - Strona, na której użytkownik się loguje.
 * @returns {Promise<Object>} - Zwraca `Promise` z obiektem reprezentującym nowy wpis logowania.
 */
async function createLoginEntry({ userId, login, page }) {
  const timestamp = new Date().toISOString();
  const result = await db
    .insert(loginEntries)
    .values({ userId, login, page, timestamp })
    .returning();
  return result;
}

module.exports = {
  getLoginEntriesByUserId,
  createLoginEntry,
};
