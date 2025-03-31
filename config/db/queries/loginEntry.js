const db = require("../drizzleDB");
const { loginEntries } = require("../schema");
const { eq } = require("drizzle-orm");

async function getLoginEntriesByUserId(userId) {
  const result = await db
    .select()
    .from(loginEntries)
    .where(eq(loginEntries.userId, userId));
  return result;
}
async function createLoginEntry({ userId, login, page }) {
  const timestamp = new Date().toISOString();
  console.log(timestamp);
  await db.insert(loginEntries).values({ userId, login, page, timestamp });
}

module.exports = {
  getLoginEntriesByUserId,
  createLoginEntry,
};
