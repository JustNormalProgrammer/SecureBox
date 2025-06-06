const db = require("../drizzleDB");
const crypto = require("node:crypto");
const { users,passwordResetTokens, loginAttempts } = require("../schema");
const { eq, and, gte } = require("drizzle-orm");

/**
 * Pobiera użytkownika z bazy danych na podstawie jego ID.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby pobrać użytkownika na podstawie unikalnego identyfikatora.
 *
 * @async
 * @function getUserById
 * @param {string} userId - ID użytkownika, którego chcesz pobrać.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę z użytkownikiem, lub pustą tablicę, jeśli użytkownik nie istnieje.
 */
async function getUserById(userId) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result;
}

/**
 * Sprawdza, czy użytkownik może się zalogować na podstawie liczby nieudanych prób logowania
 * w ostatnich 10 minutach oraz ewentualnego aktywnego okresu blokady.
 * 
 * Funkcja liczy liczbę nieudanych prób logowania użytkownika w ciągu ostatnich 10 minut.
 * Jeśli liczba nieudanych prób wynosi 5 lub więcej, sprawdza, czy blokada (czas blokady 10 minut)
   nadal jest aktywna. Jeśli tak, użytkownik nie może się zalogować. 
 * Zwraca obiekt, który zawiera informację, czy użytkownik może się zalogować oraz czas końca blokady, 
 * jeśli jest ona aktywna.
 * 
 * @param {string} userId - Identyfikator użytkownika, którego próby logowania mają zostać sprawdzone.
 * @returns {Promise<{canLogin: boolean, lockoutUntil: Date | undefined}>} Obiekt z informacją o możliwości logowania oraz czasem końca blokady (jeśli dotyczy).
 * @throws {Error} W przypadku błędów podczas odczytu danych z bazy danych.
 */
async function canUserLogin(userId) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  // Count failed login attempts in last 10 minutes
  
    const failedAttempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.userId, userId),
        eq(loginAttempts.success, false),
        gte(loginAttempts.timestamp, tenMinutesAgo.toISOString())
      )
    );

  // If 5 or more failed attempts, check if lockout period is still active
  if (failedAttempts.length >= 5) {
    const lastFailedAttempt = failedAttempts.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
    
    const lockoutEnd = new Date(new Date(lastFailedAttempt.timestamp).getTime() + 10 * 60 * 1000);
    if (lockoutEnd > new Date()) {
      return { canLogin: false, lockoutUntil: lockoutEnd };
    }
  }
  
  return { canLogin: true };
}

/**
 * Rejestruje próbę logowania użytkownika w bazie danych, zapisując jej wynik (sukces lub porażka).
 * 
 * Funkcja tworzy nowy rekord w tabeli `loginAttempts` z informacjami o użytkowniku, czasie próby logowania
 * oraz wyniku próby (sukces lub porażka).
 * 
 * @param {string} userId - Identyfikator użytkownika, który podjął próbę logowania.
 * @param {boolean} success - Wynik próby logowania: `true` oznacza sukces, `false` oznacza porażkę.
 * @returns {Promise<void>} 
 * @throws {Error} W przypadku problemów z zapisaniem danych do bazy.
 */
async function recordLoginAttempt(userId, success) {
  const id = crypto.randomUUID();
  await db.insert(loginAttempts).values({
    id,
    userId,
    timestamp: new Date().toISOString(),
    success
  });
}

/**
 * Tworzy nowego użytkownika w bazie danych.
 * 
 * Ta funkcja tworzy nowego użytkownika, zapisując jego dane, w tym zaszyfrowane hasło.
 *
 * @async
 * @function createUser
 * @param {Object} userData - Dane użytkownika.
 * @param {string} userData.firstName - Imię użytkownika.
 * @param {string} userData.lastName - Nazwisko użytkownika.
 * @param {string} userData.login - Login użytkownika.
 * @param {string} userData.password - Hasło użytkownika.
 * @returns {Promise<string>} - Zwraca `Promise` z ID nowo utworzonego użytkownika.
 */
async function createUser({ firstName, lastName, login, password }) {
  const id = crypto.randomUUID();
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  await db
    .insert(users)
    .values({ id, firstName, lastName, login, password: hashedPassword });
  return id;
}

/**
 * Pobiera użytkownika z bazy danych na podstawie jego loginu.
 * 
 * Ta funkcja wykonuje zapytanie do bazy danych, aby znaleźć użytkownika na podstawie loginu.
 *
 * @async
 * @function getUserByLogin
 * @param {string} login - Login użytkownika, którego chcesz pobrać.
 * @returns {Promise<Object[]>} - Zwraca `Promise` zawierający tablicę z użytkownikiem, lub pustą tablicę, jeśli użytkownik nie istnieje.
 */
async function getUserByLogin(login) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.login, login))
    .limit(1);
  return user;
}

/**
 * Pobiera użytkownika na podstawie loginu i hasła.
 * 
 * Ta funkcja sprawdza, czy użytkownik istnieje w bazie danych na podstawie loginu i hasła. Hasło jest weryfikowane po jego
 * zaszyfrowaniu.
 *
 * @async
 * @function getUserByLoginAndPassword
 * @param {string} login - Login użytkownika.
 * @param {string} password - Hasło użytkownika.
 * @returns {Promise<Object[]>} - Zwraca `Promise` z użytkownikiem, jeśli login i hasło są poprawne.
 */
async function getUserByLoginAndPassword(login, password) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.login, login))
    .limit(1);
  
  if (!user) {
    return null;
  }
  const loginCheck = await canUserLogin(user.id);
  if (!loginCheck.canLogin) {
    await recordLoginAttempt(user.id, false);
    return { error: "Account locked", lockoutUntil: loginCheck.lockoutUntil };
  }
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  
  if (hashedPassword !== user.password) {
    await recordLoginAttempt(user.id, false);
    return null;
  }

  await recordLoginAttempt(user.id, true);
  return [user];
}

/**
 * Aktualizuje dane użytkownika w bazie danych.
 * 
 * Ta funkcja aktualizuje dane użytkownika, takie jak imię, nazwisko, login lub hasło. Hasło jest przechowywane w postaci zaszyfrowanej.
 *
 * @async
 * @function updateUser
 * @param {string} id - ID użytkownika, którego dane mają zostać zaktualizowane.
 * @param {Object} updates - Nowe dane użytkownika.
 * @param {string} [updates.firstName] - Nowe imię użytkownika.
 * @param {string} [updates.lastName] - Nowe nazwisko użytkownika.
 * @param {string} [updates.login] - Nowy login użytkownika.
 * @param {string} [updates.password] - Nowe hasło użytkownika (zostanie zaszyfrowane).
 * @returns {Promise<void>} - Funkcja nie zwraca żadnej wartości.
 */
async function updateUser(id, { firstName, lastName, login, password }) {
  const updates = {};
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (login) updates.login = login;
  if (password)
    updates.password = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
  await db.update(users).set(updates).where(eq(users.id, id));
}

/**
 * Zapisuje token resetowania hasła dla użytkownika.
 * 
 * Ta funkcja zapisuje token resetowania hasła w tabeli, ustawiając czas wygaśnięcia tokenu.
 *
 * @async
 * @function saveResetToken
 * @param {string} userId - ID użytkownika, który ma token resetowania.
 * @param {string} resetToken - Token resetowania hasła.
 * @returns {Promise<Object>} - Zwraca zapisany token wraz z czasem wygaśnięcia.
 */
async function saveResetToken(userId, resetToken) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 10000);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    id,
    userId,
    token: resetToken,
    expiresAt,
  });

  return { id, userId, token: resetToken, expiresAt };
}

/**
 * Weryfikuje token resetowania hasła.
 * 
 * Ta funkcja sprawdza, czy podany token resetowania jest ważny i czy jeszcze nie wygasł.
 *
 * @async
 * @function verifyResetToken
 * @param {string} resetToken - Token resetowania hasła.
 * @returns {Promise<Object|null>} - Zwraca użytkownika, jeśli token jest ważny, w przeciwnym razie `null`.
 */
async function verifyResetToken(resetToken) {
  const currentTime = new Date();

  const [tokenRecord] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      token: passwordResetTokens.token,
      expiresAt: passwordResetTokens.expiresAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, resetToken))
    .limit(1);

  if (!tokenRecord || new Date(tokenRecord.expiresAt) < currentTime) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRecord.userId))
    .limit(1);

  return user || null;
}

/**
 * Usuwa token resetowania hasła z bazy danych.
 * 
 * Ta funkcja usuwa token resetowania hasła, aby nie był już używany.
 *
 * @async
 * @function deleteResetToken
 * @param {string} resetToken - Token, który ma zostać usunięty.
 * @returns {Promise<boolean>} - Zwraca `true`, jeśli token został usunięty, w przeciwnym razie `false`.
 */
async function deleteResetToken(resetToken) {
  const [deletedToken] = await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, resetToken))
    .returning({ id: passwordResetTokens.id });

  return deletedToken ? true : false;
}


module.exports = {
  getUserById,
  createUser,
  getUserByLoginAndPassword,
  updateUser,
  getUserByLogin,
  canUserLogin,
  recordLoginAttempt,
  saveResetToken,
  deleteResetToken,
  verifyResetToken
};
