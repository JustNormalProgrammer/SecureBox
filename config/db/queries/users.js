const db = require("../drizzleDB");
const crypto = require("crypto");
const { users } = require("../schema");
const { eq, and } = require("drizzle-orm");

async function getUserById(userId) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result;
}
async function createUser({ firstName, lastName, login, password }) {
  const id = crypto.randomUUID();
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  await db
    .insert(users)
    .values({ id, firstName, lastName, login, password: hashedPassword });
  return id;
}
async function getUserByLoginAndPassword(login, password) {
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.login, login), eq(users.password, hashedPassword)))
    .limit(1);
  return user;
}
async function updateUser(id, { firstName, lastName, login, password }) {
  const updates = {};
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (login) updates.login = login;
  if (password)
    updates.password = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");
  await db.update(users).set(updates).where(eq(users.id, id));
}

module.exports = {
  getUserById,
  createUser,
  getUserByLoginAndPassword,
  updateUser,
};
