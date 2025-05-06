const { drizzle } = require("drizzle-orm/node-postgres");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../..", ".env") });
const { users, passwords, loginEntries, trustedDevices } = require("./schema");

const isProduction = process.env.NODE_ENV === 'production';

const db = drizzle({
  connection: process.env.DATABASE_URL,
  logger: isProduction,
  schema: { users, passwords, loginEntries, trustedDevices },
});
module.exports = db;
