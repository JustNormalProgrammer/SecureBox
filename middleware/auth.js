const jwt = require("jsonwebtoken");
const { getUserById } = require("../config/db/queries/users");

require("dotenv").config();

/**
 * Middleware do autentykacji tokenu JWT.
 * 
 * Weryfikuje, czy w nagłówku żądania znajduje się ważny token JWT. 
 * Jeśli token jest poprawny, użytkownik jest dodawany do obiektu `req.user`. 
 * Jeśli token jest nieważny lub wygasł, zwróci odpowiedni błąd.
 * 
 * @function authenticateToken
 * @param {Object} req - Obiekt żądania.
 * @param {Object} req.headers - Nagłówki żądania.
 * @param {string} req.headers["authorization"] - Nagłówek autoryzacji, zawierający token JWT w formacie "Bearer <token>".
 * @param {Object} res - Obiekt odpowiedzi.
 * @param {function} next - Funkcja, która przekazuje kontrolę do kolejnego middleware.
 * @returns {Object} - Zwraca odpowiedź HTTP z kodem błędu, jeśli token jest nieważny lub wygasł.
 * @throws {Error} - Zgłasza wyjątek, jeśli wystąpi błąd podczas weryfikacji tokenu.
 */
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ detail: "No token provided" });
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    const [user] = await getUserById(payload.user_id);

    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }
    
    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      password: user.password,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ detail: "Token has expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ detail: "Invalid token" });
    }
    return res.status(500).json({ detail: "Internal server error" });
  }
};

module.exports = { authenticateToken, SECRET_KEY: process.env.SECRET_KEY, TOKEN_EXPIRATION_MINUTES: process.env.TOKEN_EXPIRATION_MINUTES };
