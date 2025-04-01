const db = require("../drizzleDB");
const { trustedDevices } = require("../schema");
const { eq, and } = require("drizzle-orm");

async function getTrustedDevicesByUserId(userId) {
  const result = await db
    .select()
    .from(trustedDevices)
    .where(eq(trustedDevices.userId, userId));
  return result;
}
async function upsertTrustedDevice({ userId, deviceId, userAgent, isTrusted }) {
  const existingDevice = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceId, deviceId)
      )
    );
  if (existingDevice.length > 0) {
    await db
      .update(trustedDevices)
      .set({ userId, deviceId, userAgent, isTrusted })
      .where(
        and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceId, deviceId)
        )
      );
  } else {
    await db
      .insert(trustedDevices)
      .values({ userId, deviceId, userAgent, isTrusted });
  }
}
// returns device if it existed before deletion, otherwise returns []
async function deleteTrustedDevice({ userId, deviceId }) {
  const result = await db
    .delete(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceId, deviceId)
      )
    )
    .returning();
  return result;
}

module.exports = {
  getTrustedDevicesByUserId,
  upsertTrustedDevice,
  deleteTrustedDevice,
};
