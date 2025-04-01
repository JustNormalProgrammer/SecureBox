const jwt = require("jsonwebtoken");
const { getUserById } = require("../config/db/queries/users");
const SECRET_KEY = "your-secret-key";
const TOKEN_EXPIRATION_MINUTES = 30;

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) throw new CustomError("No token provided!", 401);
    const payload = jwt.verify(token, SECRET_KEY);
    const [user] = await getUserById(payload.user_id);
    if (!user) {
      throw new CustomError("User not found", 401);
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
    next(err);
  }
};


module.exports = { authenticateToken, SECRET_KEY, TOKEN_EXPIRATION_MINUTES };
