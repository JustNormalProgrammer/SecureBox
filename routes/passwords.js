const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const {
  getPasswordByUserId,
  createPassword,
  getPasswordByUserPlatformLogin,
  deletePassword,
} = require("../config/db/queries/password");
const {
  createPasswordFile,
  updatePasswordFile,
  deletePasswordFile,
  createUserFilesZip,
} = require("../utils/fileHandler");
const { body, validationResult } = require("express-validator");
const { getHash } = require("../utils/hashGen");

const validateLoginCredentials = [
  body("platform")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "Platform field cannot be empty and must not exceed 50 characters"
    ),
  body("login")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(
      "Login field cannot be empty and must not exceed 50 characters"
    ),
  body("password")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Password field cannot be empty"),
];

router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const passwords = await getPasswordByUserId(req.user.id);
    const res2 = await Promise.all(passwords.map(async (p) => ({
      ...p,
      passwordfile: await getHash(p.id),
    })))
     res.json(res2);
  })
);

router.get(
  "/:user_id/files",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    if (user_id !== req.user.id)
      return res.status(403).json({ detail: "Forbidden" });
    createUserFilesZip(user_id, res);
  })
);

router.post(
  "/:user_id/files",
  authenticateToken,
  validateLoginCredentials,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    const { password, platform, login, logo } = req.body;
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new CustomError("Invalid user ID", 400);
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );
    }
    const [loginCredentials] = await getPasswordByUserPlatformLogin(
      userId,
      platform,
      login
    );
    if (loginCredentials) {
      throw new CustomError("Login credentials already exist", 400);
    }
    const id = await createPassword({
      logo: "https://img.freepik.com/darmowe-wektory/nowy-projekt-ikony-x-logo-twittera-2023_1017-45418.jpg?semt=ais_hybrid",
      platform,
      login,
      userId,
    });
    const filename = await createPasswordFile(userId, id, password);
    res.status(201).json({ id, passwordfile: filename, logo, platform, login, userId });
  })
);
router.put(
  "/:user_id/passwords/:platform/:login",
  authenticateToken,
  body("new_password")
    .trim()
    .isLength({ min: 1 })
    .withMessage("New password field cannot be empty"),
  asyncHandler(async (req, res) => {
    const { user_id: userId, platform, login } = req.params;
    const { new_password } = req.body;
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new CustomError("Invalid user ID", 400);
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new CustomError(
        errors.array().map((err) => err.msg),
        400
      );
    const [loginCredentials] = await getPasswordByUserPlatformLogin(
      userId,
      platform,
      login
    );
    if (!loginCredentials) throw new CustomError("Password not found", 404);
    const newFilename = await updatePasswordFile(
      userId,
      loginCredentials.id,
      new_password
    );
    res.json({
      id: loginCredentials.id,
      passwordfile: newFilename,
      logo: loginCredentials.logo,
      platform,
      login,
      userId,
    });
  })
);

router.delete(
  "/:user_id/passwords/:platform/:login",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId, platform, login } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new CustomError("Invalid user ID", 400);
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const [loginCredentials] = await getPasswordByUserPlatformLogin(
      userId,
      platform,
      login
    );
    if (!loginCredentials) throw new CustomError("Password not found", 404);
    await deletePasswordFile(userId, loginCredentials.id);
    await deletePassword(userId, platform, login);
    res.json({ message: `Password for ${platform}/${login} deleted` });
  })
);

router.put(
  "/:user_id/passwords",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    const { passwordsall } = req.body;
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new CustomError("Invalid user ID", 400);
    if (userId !== req.user.id) throw new CustomError("Forbidden", 403);
    const passwords = await getPasswordByUserId(userId);
    if (passwords.length === 0)
      throw new CustomError("No passwords found", 404);
    if (!Array.isArray(passwordsall)) {
      throw new CustomError("passwordsall must be an array", 400);
    }
    for (const p of passwordsall) {
      const isInvalid =
        typeof p !== "object" ||
        !p ||
        typeof p.platform !== "string" ||
        typeof p.login !== "string" ||
        (p.new_password !== undefined && typeof p.new_password !== "string");
    
      if (isInvalid) {
        throw new CustomError("Invalid password data format", 400);
      }
    }
    const existingKeys = new Set(
      passwords.map((e) => `${e.platform}/${e.login}`)
    );
    const inputKeys = new Set(
      passwordsall.map((p) => `${p.platform}/${p.login}`)
    );
    if (
      existingKeys.size !== inputKeys.size ||
      ![...existingKeys].every((k) => inputKeys.has(k))
    ) {
      throw new CustomError("All accounts must be updated", 400);
    }
    const updatedEntries = [];
    for (const newPasswordData of passwordsall) {
      const { platform, login, new_password } = newPasswordData;
      const entry = passwords.find(
        (e) => e.platform === platform && e.login === login
      );
      if (!entry) continue;
      await updatePasswordFile(userId, entry.id, new_password);
      updatedEntries.push({
        id: entry.id,
        logo: entry.logo,
        platform,
        login,
        userId,
      });
    }
    res.json(updatedEntries);
  })
);

module.exports = router;
