const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const { getUserByLoginAndPassword } = require("../config/db/queries/users");
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require("../middleware/auth");
const {validateRecaptcha} = require("../utils/captcha");

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
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
