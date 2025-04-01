const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");

const createPasswordFile = async (userId, password) => {
  const passwordHash = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  const filename = `${passwordHash.slice(0, 8)}.txt`;
  const folderPath = path.join("files", userId);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, filename), password);
  return filename;
};

const updatePasswordFile = async (userId, oldFilename, newPassword) => {
  const folderPath = path.join("files", userId);
  const oldFilePath = path.join(folderPath, oldFilename);
  const newPasswordHash = crypto
    .createHash("sha256")
    .update(newPassword)
    .digest("hex");
  const newFilename = `${newPasswordHash.slice(0, 8)}.txt`;
  const newFilePath = path.join(folderPath, newFilename);

  if (
    await fs
      .access(oldFilePath)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.unlink(oldFilePath);
  }
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(newFilePath, newPassword);
  return newFilename;
};

const deletePasswordFile = async (userId, filename) => {
  const filePath = path.join("files", userId, filename);
  if (
    await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.unlink(filePath);
  }
};

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
