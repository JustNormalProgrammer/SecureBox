const db = require("../drizzleDB");
const { passwords } = require("../schema");
const { eq, and } = require("drizzle-orm");

async function getPasswordByUserId(userId) {
  const result = await db
    .select()
    .from(passwords)
    .where(eq(passwords.userId, userId));
  return result;
}
async function createPassword({ passwordfile, logo, platform, login, userId }) {
  const id = crypto.randomUUID();
  await db
    .insert(passwords)
    .values({ id, passwordfile, logo, platform, login, userId });
  return id;
}
async function getPasswordByUserPlatformLogin(userId, platform, login) {
  const result = await db
    .select()
    .from(passwords)
    .where(
      and(
        eq(passwords.userId, userId),
        eq(passwords.platform, platform),
        eq(passwords.login, login)
      )
    );
  return result;
}
async function updatePassword(id, passwordfile) {
  await db.update(passwords).set({ passwordfile }).where(eq(passwords.id, id));
}
async function deletePassword(userId, platform, login) {
  const result = await db
    .delete(passwords)
    .where(
      and(
        eq(passwords.userId, userId),
        eq(passwords.platform, platform),
        eq(passwords.login, login)
      )
    )
    .returning();
  return result;
}

module.exports = {
  getPasswordByUserId,
  createPassword,
  getPasswordByUserPlatformLogin,
  updatePassword,
  deletePassword,
};
