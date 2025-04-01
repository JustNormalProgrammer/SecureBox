const jwt = require("jsonwebtoken");
const { getUserById } = require("../config/db/queries/users");
const SECRET_KEY = "your-secret-key";
const TOKEN_EXPIRATION_MINUTES = 30;

const authenticateToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ detail: "No token provided" });
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const [user] = await getUserById(payload.user_id);

    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }
    // password in request - safe???
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

module.exports = { authenticateToken, SECRET_KEY, TOKEN_EXPIRATION_MINUTES };
