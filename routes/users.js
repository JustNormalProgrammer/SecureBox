/**
 * @file Plik obsługujący operacje związane z użytkownikami, w tym:
 * - Tworzenie użytkownika
 * - Aktualizacja danych użytkownika
 * - Obsługa loginów i urządzeń zaufanych
 * - Resetowanie hasła
 *
 * Ten plik zawiera zestaw endpointów REST API do zarządzania użytkownikami:
 * - Endpoint do tworzenia nowego użytkownika.
 * - Endpoint do aktualizacji danych użytkownika.
 * - Endpointy do zarządzania loginami i urządzeniami zaufanymi.
 * - Obsługa tokenów resetujących hasło.
 *
 * Wszystkie operacje wymagają uwierzytelnienia (token JWT) dla operacji związanych z użytkownikiem.
 * Operacje te są dostępne pod ścieżkami:
 * - `/users`: tworzenie nowego użytkownika
 * - `/users/{user_id}`: aktualizacja danych użytkownika
 * - `/users/{user_id}/logins`: zarządzanie loginami użytkownika
 * - `/users/{user_id}/trusted-devices`: zarządzanie urządzeniami zaufanymi
 * - `/reset-password`: resetowanie hasła użytkownika
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { sendResetEmail } = require("../utils/emailUtils");
const {generateResetToken} = require("../utils/tokenUtils");
const {
  getUserById,
  getUserByLoginAndPassword,
  saveResetToken,
  createUser,
  updateUser,
  deleteResetToken,
  verifyResetToken,
  getUserByLogin,
} = require("../config/db/queries/users");
const {
  getLoginEntriesByUserId,
  createLoginEntry,
} = require("../config/db/queries/loginEntry");
const {
  getTrustedDevicesByUserId,
  upsertTrustedDevice,
  deleteTrustedDevice,
} = require("../config/db/queries/trustedDevice");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const fs = require("fs").promises;
const path = require("path");
const { body, validationResult } = require("express-validator");
const { createUserFilesZip } = require("../utils/fileHandler");
const {validateRecaptcha} = require("../utils/captcha");

const validateUser = [
  body("first_name")
    .optional()
    .trim()
    .isAlpha("pl-PL", {ignore: " -'"})
    .withMessage("First name must contain only letters except for space, - and ' characters ")
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "First name cannot be empty and must not exceed 50 characters"
    ),
  body("last_name")
    .optional()
    .trim()
    .isAlpha("pl-PL", { ignore: " -'" })
    .withMessage(
      "Last name must contain only letters except for space, - and ' characters"
    )
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name cannot be empty and must not exceed 50 characters"),
  body("login")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Login must be a valid email adress")
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "Login field cannot be empty and must not exceed 50 characters"
    ),
  body("password")
    .optional()
    .trim()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password field must be at least 8 characters long, contain at least one lowercase letter, uppercase letter, number and a symbol"
    ),
];
const validateLogin = [
  body("login")
    .trim()
    .isEmail()
    .withMessage("Login must be a valid email adress")
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "Login field cannot be empty and must not exceed 50 characters"
    ),
  body("page")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "Page field cannot be empty and must not exceed 50 characters"
    ),
];

const validatePassword = [
  body("newPassword")
    .optional()
    .trim()
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password field must be at least 8 characters long, contain at least one lowercase letter, uppercase letter, number and a symbol"
    ),
]

/**
 * Tworzy nowego użytkownika.
 *
 * Endpoint: POST /
 *
 * Oczekuje w ciele żądania (req.body):
 * - first_name: Imię użytkownika (string)
 * - last_name: Nazwisko użytkownika (string)
 * - login: Nazwa użytkownika (string, unikalna)
 * - password: Hasło użytkownika (string)
 *
 * Zwraca:
 * - 201 Created z JSON-em zawierającym dane nowego użytkownika (bez hasła)
 *
 * Błędy:
 * - 400 Bad Request – gdy login już istnieje
 * - 500 Internal Server Error – inne błędy serwera
 *
 * @route POST /
 * @group Użytkownicy - Operacje na użytkownikach
 * @param {string} first_name.body.required - Imię użytkownika
 * @param {string} last_name.body.required - Nazwisko użytkownika
 * @param {string} login.body.required - Login użytkownika (unikalny)
 * @param {string} password.body.required - Hasło użytkownika
 * @returns {object} 201 - Utworzony użytkownik (id, firstName, lastName, login)
 * @returns {Error} 400 - Login already exists
 * @returns {Error} 500 - Błąd serwera
 * @example request
 * {
 *   "first_name": "Jan",
 *   "last_name": "Kowalski",
 *   "login": "janek123",
 *   "password": "tajnehaslo"
 * }
 * @example response
 * HTTP/1.1 201 Created
 * {
 *   "id": "42",
 *   "firstName": "Jan",
 *   "lastName": "Kowalski",
 *   "login": "janek123"
 * }
 */
router.post(
  "/",
  validateUser,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );
    const {
      first_name: firstName,
      last_name: lastName,
      login,
      password,
    } = req.body;
    if (!firstName || !lastName || !login || !password) {
      throw new CustomError("All fields are required", 400);
    }
    const existingUser = await getUserByLogin(login);
    if (existingUser.length > 0)
      throw new CustomError("Login already exists", 400);
    const recaptchaToken = req.body.token;
    const recaptchaResult = await validateRecaptcha(recaptchaToken);
    if (!recaptchaResult) throw new CustomError("Invalid reCAPTCHA", 400);
    const id = await createUser({ firstName, lastName, login, password });
    await fs.mkdir(path.join("files", id), { recursive: true });
    res.status(201).json({ id, firstName, lastName, login });
  })
);

/**
 * Aktualizuje dane użytkownika.
 *
 * Endpoint: PATCH /:user_id
 *
 * Oczekuje w ciele żądania (req.body):
 * - first_name: Imię użytkownika (string, opcjonalne)
 * - last_name: Nazwisko użytkownika (string, opcjonalne)
 * - login: Login użytkownika (string, opcjonalny)
 * - password: Nowe hasło użytkownika (string, opcjonalne)
 *
 * Zwraca:
 * - 200 OK z JSON-em zawierającym zaktualizowane dane użytkownika
 *
 * Błędy:
 * - 403 Forbidden – jeśli próbujesz zaktualizować dane innego użytkownika
 * - 400 Bad Request – jeśli brak jest danych do zaktualizowania
 * - 404 Not Found – jeśli użytkownik nie zostanie znaleziony
 *
 * @route PATCH /:user_id
 * @group Użytkownicy - Operacje na użytkownikach
 * @param {string} user_id.path.required - ID użytkownika do aktualizacji
 * @param {string} first_name.body.optional - Nowe imię użytkownika
 * @param {string} last_name.body.optional - Nowe nazwisko użytkownika
 * @param {string} login.body.optional - Nowy login użytkownika
 * @param {string} password.body.optional - Nowe hasło użytkownika
 * @returns {object} 200 - Zaktualizowane dane użytkownika (id, firstName, lastName, login)
 * @returns {Error} 403 - Forbidden, jeśli użytkownik próbuje zaktualizować dane innego użytkownika
 * @returns {Error} 400 - Bad Request, jeśli brak danych do zaktualizowania
 * @returns {Error} 404 - Not Found, jeśli użytkownik nie istnieje
 * @example request
 * {
 *   "first_name": "Jan",
 *   "last_name": "Nowak",
 *   "login": "nowak.jan",
 *   "password": "nowehhaslo"
 * }
 * @example response
 * HTTP/1.1 200 OK
 * {
 *   "id": "42",
 *   "first_name": "Jan",
 *   "last_name": "Nowak",
 *   "login": "nowak.jan"
 * }
 */
router.patch(
  "/:user_id",
  authenticateToken,
  validateUser,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );
      const updatedFields= {};

    if (req.body.first_name !== undefined) updatedFields.firstName = req.body.first_name;
    if (req.body.last_name !== undefined) updatedFields.lastName = req.body.last_name;
    if (req.body.password !== undefined) updatedFields.password = req.body.password;
    await updateUser(userId, updatedFields);
    const [user] = await getUserById(userId);
    if (!user) throw new CustomError("User not found", 404);
    res.json({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      login: user.login,
    });
  })
);

/**
 * Pobiera dane użytkownika.
 * 
 * Endpoint: GET /:user_id
 * 
 * Oczekuje w parametrach URL:
 * - user_id: ID użytkownika (string)
 * 
 * Zwraca:
 * - 200 OK z JSON-em zawierającym dane użytkownika (id, firstName, lastName, login)
 * 
 * Błędy:
 * - 403 Forbidden – jeśli próbujesz pobrać dane innego użytkownika
 * - 404 Not Found – jeśli użytkownik nie zostanie znaleziony
 */
router.get(
  "/:user_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const [user] = await getUserById(userId);
    if (!user) throw new CustomError("User not found", 404);
    res.json({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      login: user.login,
    });
  })
);

/**
 * Obsługuje żądanie GET dla endpointu "/me/get".
 * 
 * Endpoint ten służy do zwrócenia danych użytkownika po autentykacji za pomocą tokena JWT. 
 * Wymaga, aby użytkownik był zalogowany, co jest zapewnione przez middleware `authenticateToken`.
 * Po pomyślnej autentykacji, zwracane są dane użytkownika w formacie JSON.
 * 
 * @route GET /me/get
 * @group User - Operacje związane z użytkownikiem
 * @param {object} req - Obiekt żądania zawierający dane autentykacji i informacje o użytkowniku.
 * @param {object} res - Obiekt odpowiedzi, który zostanie użyty do zwrócenia danych użytkownika.
 * @returns {object} 200 - Dane użytkownika w formacie JSON.
 * @throws {401} - Jeśli token autentykacyjny jest nieważny lub brak tokena.
 */
router.get("/me/get", authenticateToken, (req, res) => {
  res.json(req.user);
});

/**
 * Obsługuje żądanie GET dla endpointu "/:user_id/logins".
 * 
 * Endpoint ten zwraca historię logowań użytkownika o podanym identyfikatorze (`user_id`). 
 * Żądanie wymaga autentykacji za pomocą tokena JWT oraz sprawdzenia, czy ID użytkownika w tokenie 
 * zgadza się z ID podanym w parametrze URL. Jeśli te identyfikatory nie są zgodne, żądanie 
 * jest traktowane jako zabronione. Po pomyślnej autentykacji, zwracana jest lista wpisów 
 * dotyczących logowań użytkownika.
 * 
 * @route GET /:user_id/logins
 * @group User - Operacje związane z użytkownikami
 * @param {string} user_id - Identyfikator użytkownika, dla którego mają zostać zwrócone dane logowań.
 * @param {object} req - Obiekt żądania, zawierający dane autentykacyjne oraz parametr `user_id`.
 * @param {object} res - Obiekt odpowiedzi, który zostanie użyty do zwrócenia danych logowań użytkownika.
 * @returns {Array<object>} 200 - Lista wpisów logowań użytkownika w formacie JSON.
 * @throws {403} - Jeśli ID użytkownika w tokenie JWT nie zgadza się z ID w parametrze `user_id`.
 * @throws {404} - Jeśli użytkownik o podanym `user_id` nie został znaleziony.
 */
router.get(
  "/:user_id/logins",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const [user] = await getUserById(userId);
    if (!user) throw new CustomError("User not found", 404);
    const loginEntries = await getLoginEntriesByUserId(userId);
    res.json(loginEntries);
  })
);

/**
 * Obsługuje żądanie POST dla endpointu "/:user_id/logins".
 * 
 * Endpoint ten umożliwia zapisanie nowego wpisu logowania dla użytkownika o podanym identyfikatorze 
 * (`user_id`). Żądanie wymaga autentykacji za pomocą tokena JWT oraz walidacji danych logowania 
 * (przy użyciu middleware `validateLogin`). Przed zapisaniem logowania, funkcja sprawdza, 
 * czy ID użytkownika w tokenie zgadza się z ID w parametrze URL. Jeśli te identyfikatory nie są zgodne, 
 * żądanie jest traktowane jako zabronione. Po pomyślnej walidacji, zapisuje nowy wpis logowania 
 * i zwraca wynik w odpowiedzi.
 * 
 * @route POST /:user_id/logins
 * @group User - Operacje związane z użytkownikami
 * @param {string} user_id - Identyfikator użytkownika, dla którego ma zostać zapisany nowy wpis logowania.
 * @param {object} req - Obiekt żądania, zawierający dane autentykacyjne, parametr `user_id`, 
 *                       oraz dane logowania (`login`, `page`).
 * @param {object} res - Obiekt odpowiedzi, który zostanie użyty do zwrócenia wyniku operacji.
 * @returns {object} 201 - Zwraca stworzony wpis logowania w formacie JSON.
 * @throws {400} - Jeśli dane logowania są nieprawidłowe (błędy walidacji).
 * @throws {403} - Jeśli ID użytkownika w tokenie JWT nie zgadza się z ID w parametrze `user_id`.
 * @throws {404} - Jeśli użytkownik o podanym `user_id` nie został znaleziony.
 */
router.post(
  "/:user_id/logins",
  authenticateToken,
  validateLogin,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );
    const { user_id: userId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const { login, page } = req.body;
    const [user] = await getUserById(userId);
    if (!user) throw new CustomError("User not found", 404);
    const result = await createLoginEntry({ userId, login, page });
    return res.status(201).json(result);
  })
);

/**
 * Obsługuje żądanie GET dla endpointu "/:user_id/trusted-devices".
 * 
 * Endpoint ten zwraca listę zaufanych urządzeń użytkownika o podanym identyfikatorze (`user_id`).
 * Żądanie wymaga autentykacji za pomocą tokena JWT oraz sprawdzenia, czy ID użytkownika w tokenie 
 * zgadza się z ID podanym w parametrze URL. Jeśli te identyfikatory nie są zgodne, żądanie 
 * jest traktowane jako zabronione. Po pomyślnej autentykacji, zwracana jest lista urządzeń, 
 * która zawiera informację o tym, czy dane urządzenie jest zaufane.
 * 
 * @route GET /:user_id/trusted-devices
 * @group User - Operacje związane z użytkownikami
 * @param {string} user_id - Identyfikator użytkownika, dla którego mają zostać zwrócone urządzenia zaufane.
 * @param {object} req - Obiekt żądania, zawierający dane autentykacyjne oraz parametr `user_id`.
 * @param {object} res - Obiekt odpowiedzi, który zostanie użyty do zwrócenia listy urządzeń.
 * @returns {Array<object>} 200 - Lista urządzeń zaufanych użytkownika, gdzie każde urządzenie ma dodatkową 
 *                                właściwość `is_trusted` (boolean) wskazującą, czy urządzenie jest zaufane.
 * @throws {403} - Jeśli ID użytkownika w tokenie JWT nie zgadza się z ID w parametrze `user_id`.
 * @throws {404} - Jeśli użytkownik o podanym `user_id` nie został znaleziony.
 */
router.get(
  "/:user_id/trusted-devices",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const devices = await getTrustedDevicesByUserId(userId);
    res.json(devices.map((d) => ({ ...d, is_trusted: !!d.is_trusted })));
  })
);

/**
 * Obsługuje żądanie PATCH dla endpointu "/:user_id/trusted-devices".
 * 
 * Endpoint ten umożliwia aktualizację lub dodanie urządzenia do listy zaufanych urządzeń użytkownika.
 * Żądanie wymaga autentykacji za pomocą tokena JWT oraz sprawdzenia, czy ID użytkownika w tokenie 
 * zgadza się z ID podanym w parametrze URL. Jeśli te identyfikatory nie są zgodne, żądanie 
 * jest traktowane jako zabronione. Po pomyślnym sprawdzeniu autentykacji, urządzenie jest dodawane lub 
 * aktualizowane na liście urządzeń zaufanych użytkownika.
 * 
 * @route PATCH /:user_id/trusted-devices
 * @group User - Operacje związane z użytkownikami
 * @param {string} user_id - Identyfikator użytkownika, dla którego ma zostać zaktualizowane urządzenie zaufane.
 * @param {object} req - Obiekt żądania, zawierający dane autentykacyjne, parametr `user_id` oraz dane urządzenia
 *                       (w tym `device_id`, `user_agent` oraz `is_trusted`).
 * @param {object} res - Obiekt odpowiedzi, który zwróci zaktualizowane dane urządzenia.
 * @returns {object} 200 - Zwraca dane urządzenia po aktualizacji: `userId`, `deviceId`, `userAgent`, `isTrusted`.
 * @throws {403} - Jeśli ID użytkownika w tokenie JWT nie zgadza się z ID w parametrze `user_id`.
 * @throws {400} - Jeśli dane urządzenia są niepełne lub nieprawidłowe.
 */
router.patch(
  "/:user_id/trusted-devices",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    const {
      device_id: deviceId,
      user_agent: userAgent,
      is_trusted: isTrusted,
    } = req.body;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    await upsertTrustedDevice({ userId, deviceId, userAgent, isTrusted });
    res.json({ userId, deviceId, userAgent, isTrusted });
  })
);

/**
 * Obsługuje żądanie DELETE dla endpointu "/:user_id/trusted-devices/:device_id".
 * 
 * Endpoint ten umożliwia usunięcie urządzenia z listy zaufanych urządzeń użytkownika o podanym identyfikatorze (`user_id`)
 * oraz identyfikatorze urządzenia (`device_id`). Żądanie wymaga autentykacji za pomocą tokena JWT oraz sprawdzenia,
 * czy ID użytkownika w tokenie zgadza się z ID podanym w parametrze URL. Jeśli te identyfikatory nie są zgodne, żądanie
 * jest traktowane jako zabronione. Po pomyślnym sprawdzeniu autentykacji, urządzenie jest usuwane z listy zaufanych urządzeń.
 * 
 * @route DELETE /:user_id/trusted-devices/:device_id
 * @group User - Operacje związane z użytkownikami
 * @param {string} user_id - Identyfikator użytkownika, dla którego ma zostać usunięte urządzenie zaufane.
 * @param {string} device_id - Identyfikator urządzenia, które ma zostać usunięte z listy urządzeń zaufanych.
 * @param {object} req - Obiekt żądania, zawierający dane autentykacyjne oraz parametry `user_id` i `device_id`.
 * @param {object} res - Obiekt odpowiedzi, który zwróci wynik operacji.
 * @returns {object} 200 - Zwraca komunikat potwierdzający usunięcie urządzenia: `message`.
 * @throws {403} - Jeśli ID użytkownika w tokenie JWT nie zgadza się z ID w parametrze `user_id`.
 * @throws {404} - Jeśli urządzenie o podanym `device_id` nie zostało znalezione.
 */
router.delete(
  "/:user_id/trusted-devices/:device_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId, device_id: deviceId } = req.params;
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const result = await deleteTrustedDevice({ userId, deviceId });
    if (!result) throw new CustomError("Device not found", 404);
    res.json({ message: `Device ${deviceId} removed from trusted devices` });
  })
);

/**
 * Obsługuje żądanie POST dla endpointu "/reset-password".
 * 
 * Endpoint ten obsługuje proces resetowania hasła. Na podstawie podanego loginu użytkownika,
 * jeśli taki użytkownik istnieje, generowany jest link resetujący hasło. Zanim link zostanie wysłany,
 * wykonywana jest weryfikacja reCAPTCHA. Link resetujący jest ważny przez 10 godzin. 
 * Jeśli login istnieje, użytkownik otrzymuje wiadomość z linkiem do resetowania hasła.
 * 
 * @route POST /reset-password
 * @group Auth - Operacje związane z autentykacją
 * @param {object} req - Obiekt żądania zawierający login użytkownika oraz token reCAPTCHA.
 * @param {object} res - Obiekt odpowiedzi, który zwróci komunikat potwierdzający wysłanie linku resetującego.
 * @returns {object} 200 - Zwraca komunikat potwierdzający wysłanie linku resetującego, niezależnie od tego, czy użytkownik istnieje.
 * @throws {400} - Jeśli login jest pusty lub token reCAPTCHA jest nieważny.
 * @throws {500} - W przypadku błędów podczas generowania lub wysyłania linku resetującego.
 */
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { login } = req.body;

    if (!login) {
      throw new CustomError("Login jest wymagany", 400);
    }

    const existingUser = await getUserByLogin(login);
    if (!existingUser || existingUser.length === 0) {
      return res.status(200).json({ message: "Jeśli login istnieje, link resetujący został wysłany" });
    }

    const recaptchaToken = req.body.token;
    const recaptchaResult = await validateRecaptcha(recaptchaToken);
    if (!recaptchaResult) throw new CustomError("Invalid reCAPTCHA", 400);

    const resetToken = generateResetToken();
    await saveResetToken(existingUser[0].id, resetToken);
    const tenHoursFromNow = new Date(Date.now() + 10 * 60 * 60 * 1000); 
    const resetLink = `http://localhost:5173/reset-password/${resetToken}?exp=${tenHoursFromNow.toISOString()}`;

    await sendResetEmail(login, resetLink); 

    res.status(200).json({ message: "Jeśli login istnieje, link resetujący został wysłany" });
  })
);

/**
 * Obsługuje żądanie POST dla endpointu "/reset-password/confirm".
 * 
 * Endpoint ten umożliwia potwierdzenie zmiany hasła użytkownika na podstawie tokenu resetującego.
 * Użytkownik musi podać token resetu oraz nowe hasło. Jeśli token jest poprawny i nie wygasł,
 * hasło jest zmieniane, a token resetu jest usuwany. Ponadto, nowe hasło jest walidowane przed 
 * zapisaniem go w bazie danych. W przypadku błędów, zwracane są odpowiednie komunikaty.
 * 
 * @route POST /reset-password/confirm
 * @group Auth - Operacje związane z autentykacją
 * @param {object} req - Obiekt żądania zawierający token resetu (`resetToken`) oraz nowe hasło (`newPassword`).
 * @param {object} res - Obiekt odpowiedzi, który zwróci komunikat potwierdzający zmianę hasła.
 * @returns {object} 200 - Zwraca komunikat potwierdzający pomyślną zmianę hasła.
 * @throws {400} - Jeśli token resetu lub nowe hasło nie zostały podane lub jeśli walidacja nowego hasła nie powiedzie się.
 * @throws {401} - Jeśli token resetu jest nieprawidłowy lub wygasł.
 */
router.post(
  "/reset-password/confirm",validatePassword,
  asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new CustomError("Token resetu i nowe hasło są wymagane", 400);
    }

    const user = await verifyResetToken(resetToken);
    if (!user) {
      throw new CustomError("Nieprawidłowy lub wygasły token resetu", 401);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );

    await updateUser(user.id, { password: newPassword });
    await deleteResetToken(resetToken);
    res.status(200).json({ message: "Hasło zostało pomyślnie zmienione" });
  })
);


module.exports = router;
