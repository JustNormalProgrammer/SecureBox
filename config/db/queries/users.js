const db = require("../drizzleDB");
const crypto = require("node:crypto");
const { users,passwordResetTokens } = require("../schema");
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
async function getUserByLogin(login) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.login, login))
    .limit(1);
  return user;
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

async function saveResetToken(userId, resetToken) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 10000);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    id,
    userId,
    token: resetToken,
    expiresAt,
  });

  return { id, userId, token: resetToken, expiresAt };
}

async function verifyResetToken(resetToken) {
  const currentTime = new Date();

  const [tokenRecord] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      token: passwordResetTokens.token,
      expiresAt: passwordResetTokens.expiresAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, resetToken))
    .limit(1);

  if (!tokenRecord || new Date(tokenRecord.expiresAt) < currentTime) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRecord.userId))
    .limit(1);

  return user || null;
}

async function deleteResetToken(resetToken) {
  const [deletedToken] = await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, resetToken))
    .returning({ id: passwordResetTokens.id });

  return deletedToken ? true : false;
}


module.exports = {
  getUserById,
  createUser,
  getUserByLoginAndPassword,
  updateUser,
  getUserByLogin,
  saveResetToken,
  deleteResetToken,
  verifyResetToken
};
