const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const { getUserByLoginAndPassword } = require("../config/db/queries/users");
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require("../middleware/auth");
const {validateRecaptcha} = require("../utils/captcha");

/**
 * POST /login
 * 
 * Obsługuje logowanie użytkownika poprzez weryfikację podanych loginu i hasła. 
 * Jeśli dane uwierzytelniające są poprawne, zwrócony zostaje token JWT. 
 * W przeciwnym razie, jeśli logowanie nie powiedzie się, próba logowania jest 
 * rejestrowana, a następnie rzucany jest błąd typu CustomError z odpowiednimi 
 * komunikatami o błędzie.
 * 
 * @route POST /login
 * @param {Object} req - Obiekt żądania.
 * @param {string} req.body.login - Login użytkownika.
 * @param {string} req.body.password - Hasło użytkownika.
 * @param {Object} res - Obiekt odpowiedzi.
 * @throws {CustomError} 401 - Jeśli login lub hasło są niepoprawne.
 * @returns {Object} 200 - Dane użytkownika oraz token JWT, jeśli logowanie jest poprawne.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { login, password, token2 } = req.body;
    if (!login || !password || !token2) {
      throw new CustomError("Missing required fields", 400);
    }
    if (typeof login !== "string" || typeof password !== "string" || typeof token2 !== "string") {
      throw new CustomError("Invalid field types", 400);
    }
    if (login.trim() === "" || password.trim() === "" || token2.trim() === "") {
      throw new CustomError("Fields cannot be empty", 400);
    }
    const [user] = await getUserByLoginAndPassword(login, password);
    if (user?.error) {
      throw new CustomError(`Account locked until ${result.lockoutUntil}`,400);
    }
    if (!user) throw new CustomError("Invalid login or password", 401);
    const result = await validateRecaptcha(token2);
    if (!result) throw new CustomError("Invalid", 401);

    const token = jwt.sign({ user_id: user.id }, SECRET_KEY, {
      expiresIn: `${TOKEN_EXPIRATION_MINUTES}m`,
    });
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "strict",
      maxAge: TOKEN_EXPIRATION_MINUTES * 60 * 1000,
    });
    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login,
      },
      token: user.id,
    });
  })
);

module.exports = router;
