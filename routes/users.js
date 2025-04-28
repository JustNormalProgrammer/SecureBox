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
    if (!first_name || !last_name || !login || !password) {
      throw new CustomError("All fields are required", 400);
    }
    const existingUser = await getUserByLogin(login);
    if (existingUser.length > 0)
      throw new CustomError("Login already exists", 400);
    const id = await createUser({ firstName, lastName, login, password });
    await fs.mkdir(path.join("files", id), { recursive: true });
    res.status(201).json({ id, firstName, lastName, login });
  })
);

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

router.get("/me/get", authenticateToken, (req, res) => {
  res.json(req.user);
});

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
    const result = await createLoginEntry({ userId, login, page });
    return res.status(201).json(result);
  })
);

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

    const resetToken = generateResetToken();
    await saveResetToken(existingUser[0].id, resetToken);
    const tenHoursFromNow = new Date(Date.now() + 10 * 60 * 60 * 1000); 
    const resetLink = `http://localhost:5173/reset-password/${resetToken}?exp=${tenHoursFromNow.toISOString()}`;

    await sendResetEmail(login, resetLink); 

    res.status(200).json({ message: "Jeśli login istnieje, link resetujący został wysłany" });
  })
);



router.post(
  "/reset-password/confirm",
  asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      throw new CustomError("Token resetu i nowe hasło są wymagane", 400);
    }

    const user = await verifyResetToken(resetToken);
    if (!user) {
      throw new CustomError("Nieprawidłowy lub wygasły token resetu", 401);
    }

    await updateUser(user.id, { password: newPassword });
    await deleteResetToken(resetToken);
    res.status(200).json({ message: "Hasło zostało pomyślnie zmienione" });
  })
);


module.exports = router;
