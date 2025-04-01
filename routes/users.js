const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getUserById,
  getUserByLoginAndPassword,
  createUser,
  updateUser,
} = require("../config/db/queries/users");
const {
  getLoginEntriesByUserId,
  createLoginEntry,
} = require("../config/db/queries/loginEntry");
const {
  getTrustedDevicesByUserId,
  upsertTrustedDevice,
  deleteTrustedDevice
} = require("../config/db/queries/trustedDevice")
const asyncHandler = require("express-async-handler");
const CustomError = require("../utils/customError");
const fs = require("fs").promises;
const path = require("path");

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      first_name: firstName,
      last_name: lastName,
      login,
      password,
    } = req.body;
    const existingUser = await getUserByLoginAndPassword(login, password);
    if (existingUser.length > 0) {
      return res.status(400).json({ detail: "Login already exists" });
    }
    try {
      const id = await createUser({ firstName, lastName, login, password });
      await fs.mkdir(path.join("files", id), { recursive: true });
      res.status(201).json({ id, firstName, lastName, login });
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
  })
);

router.patch(
  "/:user_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;

    if (Number(userId) !== req.user.id) {
      return res.status(403).json({ detail: "Forbidden" });
    }
    const {
      first_name: firstName,
      last_name: lastName,
      login,
      password,
    } = req.body;
    try {
      if (!firstName && !lastName && !login && !password) {
        throw new CustomError("No fields to update", 400);
      }
      await updateUser(userId, { firstName, lastName, login, password });
      const [user] = await getUserById(userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }
      res.json({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        login: user.login,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
  })
);

router.get(
  "/:user_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    if (Number(userId) !== req.user.id)
      return res.status(403).json({ detail: "Forbidden" });
    try {
      const [user] = await getUserById(userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }
      res.json({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        login: user.login,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
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
    try {
      if (Number(userId) !== req.user.id)
        throw new CustomError("Forbidden", 403);
      const [user] = await getUserById(userId);
      if (!user) {
        throw new CustomError("User not found", 404);
      }
      const loginEntries = await getLoginEntriesByUserId(userId);
      res.json(loginEntries);
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
  })
);

router.post(
  "/:user_id/logins",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    try {
      if (Number(userId) !== req.user.id)
        throw new CustomError("Forbidden", 403);
      const { login, page } = req.body;
      await createLoginEntry({userId, login, page});
    } catch (err) {
      return res.status(err.status || 500).json({ detail: err.message });
    }
  })
);

router.get(
  "/:user_id/trusted-devices",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    try{
      if (Number(userId) !== req.user.id)
        throw new CustomError("Forbidden", 403);
      const devices = await getTrustedDevicesByUserId(userId);
      res.json(devices.map((d) => ({ ...d, is_trusted: !!d.is_trusted })));
    } catch(err) {
      return res.status(err.status || 500).json({ detail: err.message || 'Something went wrong' });
    }
  })
);

router.patch(
  "/:user_id/trusted-devices",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id: userId } = req.params;
    const { device_id: deviceId, user_agent: userAgent, is_trusted: isTrusted } = req.body;
    try{
      if (Number(userId) !== req.user.id)
        throw new CustomError("Forbidden", 403);
      await upsertTrustedDevice({userId, deviceId, userAgent, isTrusted})
    } catch(err){
      return res.status(err.status || 500).json({ detail: err.message || 'Something went wrong' });
    }
  })
);

router.delete(
  "/:user_id/trusted-devices/:device_id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { user_id:userId, device_id: deviceId } = req.params;
    try{
      if (Number(userId) !== req.user.id)
        throw new CustomError("Forbidden", 403);
      const result = await deleteTrustedDevice({userId, deviceId})
      if(result.length === 0)
        throw new CustomError("Device not found", 404)
      res.json({ message: `Device ${device_id} removed from trusted devices` });
    } catch (err){
      return res.status(err.status || 500).json({ detail: err.message || 'Something went wrong' });
    }
  })
);

module.exports = router;
