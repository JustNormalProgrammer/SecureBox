const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const { getUserByLoginAndPassword } = require("../config/db/queries/users");
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require("../middleware/auth");

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { login, password } = req.body;
    try {
      const [user] = await getUserByLoginAndPassword(login, password);
      if (!user) throw new CustomError("Invalid login or password", 401);
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
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
  })
);

module.exports = router;
