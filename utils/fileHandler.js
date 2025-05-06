/**
 * @file
 * Moduł do obsługi plików związanych z hasłami użytkowników.
 * Zawiera funkcje do tworzenia, aktualizacji i usuwania plików z hasłami,
 * a także do tworzenia archiwum ZIP z plikami użytkownika.
 */

const fs = require("fs").promises;
const path = require("node:path");
const crypto = require("node:crypto");
const archiver = require("archiver");

/**
 * Tworzy plik z hasłem.
 * @param {number} userId - ID użytkownika.
 * @param {string} password - Hasło użytkownika.
 * @returns {Promise<string>} Nazwa pliku, w którym hasło zostało zapisane.
 * @throws {Error} Jeśli nie uda się utworzyć katalogu lub zapisać pliku.
 */
const createPasswordFile = async (userId, passwordId, password) => {
  const passwordIdHah = crypto
    .createHash("sha256")
    .update(passwordId)
    .digest("hex");
  const filename = `${passwordIdHah.slice(0, 8)}.txt`;
  const folderPath = path.join("files", userId);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, filename), password);
  return filename;
};

/**
 * Tworzy nowy plik ze zmienionym hasłem.
 * @param {number} userId - ID użytkownika.
 * @param {string} oldFilename - Nazwa starego pliku.
 * @param {string} newPassword - Nowe hasło użytkownika.
 * @returns {Promise<string>} Nazwa pliku, w którym (nowe) hasło zostało zapisane.
 * @throws {Error} Jeśli nie uda się utworzyć katalogu lub zapisać pliku.
 */
const updatePasswordFile = async (userId, passwordId, newPassword) => {
  const folderPath = path.join("files", userId);
  const passwordIdHash = crypto
    .createHash("sha256")
    .update(passwordId)
    .digest("hex");
  const newFilename = `${passwordIdHash.slice(0, 8)}.txt`;
  const newFilePath = path.join(folderPath, newFilename);

  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(newFilePath, newPassword);
  return newFilename;
};

/**
 * Usuwa plik z hasłem.
 * @param {number} userId - ID użytkownika.
 * @param {string} filename - Nazwa pliku do usunięcia.
 * @returns {Promise<void>}
 * @throws {Error} Jeśli nie można usunąć pliku.
 */
const deletePasswordFile = async (userId, passwordId) => {
  const fileName = crypto
  .createHash("sha256")
  .update(passwordId)
  .digest("hex");
  const filePath = path.join("files", userId, `${fileName.slice(0, 8)}.txt`);
  if (
    await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.unlink(filePath);
  }
};

/**
 * Tworzy archiwum ZIP z plikami użytkownika.
 * @param {number} userId - ID użytkownika.
 * @param {object} res - Obiekt odpowiedzi HTTP.
 * @returns {void}
 * @throws {Error} Jeśli nie można utworzyć archiwum.
 */
const createUserFilesZip = (userId, res) => {
  const folderPath = path.join("files", userId);
  const archive = archiver("zip", { zlib: { level: 9 } });
  res.attachment(`user_${userId}_files.zip`);
  archive.pipe(res);
  archive.directory(folderPath, false).finalize();
};

module.exports = {
  createPasswordFile,
  updatePasswordFile,
  deletePasswordFile,
  createUserFilesZip,
};
