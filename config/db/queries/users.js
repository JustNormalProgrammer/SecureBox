const db = require("../drizzleDB");
const crypto = require("node:crypto");
const { users,passwordResetTokens, loginAttempts } = require("../schema");
const { eq, and, gte } = require("drizzle-orm");

async function getUserById(userId) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result;
}

async function canUserLogin(userId) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  // Count failed login attempts in last 10 minutes
  
    const failedAttempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.userId, userId),
        eq(loginAttempts.success, false),
        gte(loginAttempts.timestamp, tenMinutesAgo.toISOString())
      )
    );

  // If 5 or more failed attempts, check if lockout period is still active
  if (failedAttempts.length >= 5) {
    const lastFailedAttempt = failedAttempts.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
    
    const lockoutEnd = new Date(new Date(lastFailedAttempt.timestamp).getTime() + 10 * 60 * 1000);
    if (lockoutEnd > new Date()) {
      return { canLogin: false, lockoutUntil: lockoutEnd };
    }
  }
  
  return { canLogin: true };
}

async function recordLoginAttempt(userId, success) {
  const id = crypto.randomUUID();
  await db.insert(loginAttempts).values({
    id,
    userId,
    timestamp: new Date().toISOString(),
    success
  });
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
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.login, login))
    .limit(1);
  
  if (!user) {
    return null;
  }
  const loginCheck = await canUserLogin(user.id);
  if (!loginCheck.canLogin) {
    await recordLoginAttempt(user.id, false);
    return { error: "Account locked", lockoutUntil: loginCheck.lockoutUntil };
  }
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
  
  if (hashedPassword !== user.password) {
    await recordLoginAttempt(user.id, false);
    return null;
  }

  await recordLoginAttempt(user.id, true);
  return [user];
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
  canUserLogin,
  recordLoginAttempt,
  saveResetToken,
  deleteResetToken,
  verifyResetToken
};
