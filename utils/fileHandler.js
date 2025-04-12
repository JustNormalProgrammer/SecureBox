const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const archiver = require("archiver");

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

const deletePasswordFile = async (userId, passwordId) => {
  const fileName = crypto
  .createHash("sha256")
  .update(passwordId)
  .digest("hex");
  const filePath = path.join("files", userId, `${passwordIdHah.slice(0, 8)}.txt`);
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
