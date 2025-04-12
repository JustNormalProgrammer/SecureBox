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

async function createPassword({ logo, platform, login, userId }) {
  const id = crypto.randomUUID();
  await db
    .insert(passwords)
    .values({ id, logo, platform, login, userId });
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
  deletePassword,
};
