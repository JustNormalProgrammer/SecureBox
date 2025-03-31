const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Password = require('../models/password');
const {
  createPasswordFile,
  updatePasswordFile,
  deletePasswordFile,
  createUserFilesZip,
} = require('../utils/fileHandler');

router.get('/', authenticateToken, (req, res) => {
  Password.findByUserId(req.user.id, (err, passwords) => {
    if (err) return res.status(500).json({ detail: err.message });
    res.json(passwords);
  });
});

router.get('/:user_id/files', authenticateToken, (req, res) => {
  const { user_id } = req.params;
  if (Number(user_id) !== req.user.id) return res.status(403).json({ detail: 'Forbidden' });
  createUserFilesZip(user_id, res);
});

router.post('/:user_id/files', authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  if (Number(user_id) !== req.user.id) return res.status(403).json({ detail: 'Forbidden' });
  const { password, platform, login,logo } = req.body;

  try {
    const filename = await createPasswordFile(user_id, password);
    const id = Password.create(
      {
        passwordfile: filename,
        logo: 'https://img.freepik.com/darmowe-wektory/nowy-projekt-ikony-x-logo-twittera-2023_1017-45418.jpg?semt=ais_hybrid',
        platform,
        login,
        user_id,
      },
      (err) => {
        if (err) return res.status(500).json({ detail: err.message });
        res.status(201).json({ id, passwordfile: filename, logo, platform, login, user_id });
      }
    );
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

router.put('/:user_id/passwords/:platform/:login', authenticateToken, async (req, res) => {
  const { user_id, platform, login } = req.params;
  if (Number(user_id) !== req.user.id) return res.status(403).json({ detail: 'Forbidden' });
  const { new_password } = req.body;

  Password.findByUserPlatformLogin(user_id, platform, login, async (err, entry) => {
    if (err || !entry) return res.status(404).json({ detail: 'Password not found' });
    try {
      const newFilename = await updatePasswordFile(user_id, entry.passwordfile, new_password);
      Password.update(entry.id, newFilename, (err) => {
        if (err) return res.status(500).json({ detail: err.message });
        res.json({ id: entry.id, passwordfile: newFilename, logo: entry.logo, platform, login, user_id });
      });
    } catch (error) {
      res.status(500).json({ detail: error.message });
    }
  });
});

router.delete('/:user_id/passwords/:platform/:login', authenticateToken, async (req, res) => {
  const { user_id, platform, login } = req.params;
  if (Number(user_id) !== req.user.id) return res.status(403).json({ detail: 'Forbidden' });

  Password.findByUserPlatformLogin(user_id, platform, login, async (err, entry) => {
    if (err || !entry) return res.status(404).json({ detail: 'Password not found' });
    try {
      await deletePasswordFile(user_id, entry.passwordfile);
      Password.delete(user_id, platform, login, (err) => {
        if (err) return res.status(500).json({ detail: err.message });
        res.json({ message: `Password for ${platform}/${login} deleted` });
      });
    } catch (error) {
      res.status(500).json({ detail: error.message });
    }
  });
});

router.put('/:user_id/passwords', authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  if (Number(user_id) !== req.user.id) return res.status(403).json({ detail: 'Forbidden' });
  const { passwordsall } = req.body;

  Password.findByUserId(user_id, async (err, existingEntries) => {
    if (err) return res.status(500).json({ detail: err.message });
    if (!existingEntries.length) return res.status(404).json({ detail: 'No passwords found' });

    const existingKeys = new Set(existingEntries.map((e) => `${e.platform}/${e.login}`));
    const inputKeys = new Set(passwordsall.map((p) => `${p.platform}/${p.login}`));
    if (existingKeys.size !== inputKeys.size || ![...existingKeys].every((k) => inputKeys.has(k))) {
      return res.status(400).json({ detail: 'All accounts must be updated' });
    }

    try {
      const updatedEntries = [];
      for (const newPasswordData of passwordsall) {
        const { platform, login, new_password } = newPasswordData;
        const entry = existingEntries.find((e) => e.platform === platform && e.login === login);
        if (!entry) continue;

        const newFilename = await updatePasswordFile(user_id, entry.passwordfile, new_password);
        Password.update(entry.id, newFilename, (err) => {
          if (err) throw err;
        });
        updatedEntries.push({ id: entry.id, passwordfile: newFilename, logo: entry.logo, platform, login, user_id });
      }
      res.json(updatedEntries);
    } catch (error) {
      res.status(500).json({ detail: error.message });
    }
  });
});

module.exports = router;