const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const { getUserByLoginAndPassword, getUserByLogin } = require("../config/db/queries/users");
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require("../middleware/auth");
const { failedLogins } = require("../config/db/schema");

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
    const { login, password } = req.body;
    const [user] = await getUserByLoginAndPassword(login, password);
    if (!user){
      if (!getUserByLogin(login)){
        failedLogins
          .insert({
            login: login,
            timestamp: new Date(),
          })
          .catch((error) => {
            console.error("Error inserting failed login:", error);
          });
        throw new CustomError("Invalid password", 401);}
       throw new CustomError("Invalid login", 401);
    }
       const token = jwt.sign({ user_id: user.id }, SECRET_KEY, {
      expiresIn: `${TOKEN_EXPIRATION_MINUTES}m`,
    });
    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login,
      },
      token,
    });
  })
);

module.exports = router;
