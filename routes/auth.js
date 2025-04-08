const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const { getUserByLoginAndPassword, getUserByLogin } = require("../config/db/queries/users");
const { SECRET_KEY, TOKEN_EXPIRATION_MINUTES } = require("../middleware/auth");
const { failedLogins } = require("../config/db/schema");

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
