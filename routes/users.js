const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/user");
const TrustedDevice = require("../models/trustedDevice");
const LoginEntry = require("../models/loginEntry");
const fs = require("fs").promises;
const path = require("path");

router.post("/", async (req, res) => {
  const { first_name, last_name, login, password } = req.body;
  User.findByLoginAndPassword(login, "", (err, existingUser) => {
    if (existingUser)
      return res.status(400).json({ detail: "Login already exists" });
    const id = User.create(
      { first_name, last_name, login, password },
      (err) => {
        if (err) return res.status(500).json({ detail: err.message });
        fs.mkdir(path.join("files", id), { recursive: true });
        res.status(201).json({ id, first_name, last_name, login });
      }
    );
  });
});

router.patch("/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });

  const { first_name, last_name, login, password } = req.body;
  User.update(user_id, { first_name, last_name, login, password }, (err) => {
    if (err) return res.status(500).json({ detail: err.message });
    User.findById(user_id, (err, user) => {
      if (err || !user)
        return res.status(404).json({ detail: "User not found" });
      res.json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login,
      });
    });
  });
});

router.get("/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });
  User.findById(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ detail: "User not found" });
    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      login: user.login,
    });
  });
});

router.get("/me/get", authenticateToken, (req, res) => {
  res.json(req.user);
});

router.get("/:user_id/logins", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });
  LoginEntry.findByUserId(user_id, (err, logins) => {
    if (err) return res.status(500).json({ detail: err.message });
    res.json(logins);
  });
});

router.post("/:user_id/logins", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });
  const { login, page } = req.body;
  LoginEntry.create({ user_id, login, page }, (err, entry) => {
    if (err) return res.status(500).json({ detail: err.message });
    res.status(201).json(entry);
  });
});

router.get("/:user_id/trusted-devices", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });
  TrustedDevice.findByUserId(user_id, (err, devices) => {
    if (err) return res.status(500).json({ detail: err.message });
    res.json(devices.map((d) => ({ ...d, is_trusted: !!d.is_trusted })));
  });
});

router.patch("/:user_id/trusted-devices", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (user_id !== req.user.id)
    return res.status(403).json({ detail: "Forbidden" });
  const { device_id, user_agent, is_trusted } = req.body;
  TrustedDevice.upsert(
    { user_id, device_id, user_agent, is_trusted },
    (err) => {
      if (err) return res.status(500).json({ detail: err.message });
      res.json({ user_id, device_id, user_agent, is_trusted });
    }
  );
});

router.delete(
  "/:user_id/trusted-devices/:device_id",
  authenticateToken,
  (req, res) => {
    const { user_id, device_id } = req.params;
    if (user_id !== req.user.id)
      return res.status(403).json({ detail: "Forbidden" });
    TrustedDevice.delete(user_id, device_id, (err, changes) => {
      if (err) return res.status(500).json({ detail: err.message });
      if (changes === 0)
        return res.status(404).json({ detail: "Device not found" });
      res.json({ message: `Device ${device_id} removed from trusted devices` });
    });
  }
);

module.exports = router;
