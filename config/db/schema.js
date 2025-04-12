"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustedDevices =
  exports.loginEntries =
  exports.passwords =
  exports.users =
    void 0;
const pg = require("drizzle-orm/pg-core");
exports.users = (0, pg.pgTable)(
  "users",
  {
    id: (0, pg.text)().primaryKey().notNull(),
    firstName: (0, pg.text)("first_name").notNull(),
    lastName: (0, pg.text)("last_name").notNull(),
    login: (0, pg.text)().notNull(),
    password: (0, pg.text)().notNull(),
  },
  (table) => [(0, pg.unique)("users_login_key").on(table.login)]
);
exports.passwords = (0, pg.pgTable)(
  "passwords",
  {
    id: (0, pg.text)().primaryKey().notNull(),
    logo: (0, pg.text)().notNull(),
    platform: (0, pg.text)().notNull(),
    login: (0, pg.text)().notNull(),
    userId: (0, pg.text)("user_id").notNull(),
  },
  (table) => [
    (0, pg.foreignKey)({
      columns: [table.userId],
      foreignColumns: [exports.users.id],
      name: "passwords_user_id_fkey",
    }).onDelete("cascade"),
  ]
);
exports.loginEntries = (0, pg.pgTable)(
  "login_entries",
  {
    id: (0, pg.integer)().primaryKey().generatedAlwaysAsIdentity({
      name: "login_entries_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    timestamp: (0, pg.timestamp)({
      withTimezone: true,
      mode: "string",
    }).notNull(),
    userId: (0, pg.text)("user_id").notNull(),
    login: (0, pg.text)().notNull(),
    page: (0, pg.text)().notNull(),
  },
  (table) => [
    (0, pg.foreignKey)({
      columns: [table.userId],
      foreignColumns: [exports.users.id],
      name: "login_entries_user_id_fkey",
    }).onDelete("cascade"),
  ]
);
exports.trustedDevices = (0, pg.pgTable)(
  "trusted_devices",
  {
    userId: (0, pg.text)("user_id").notNull(),
    deviceId: (0, pg.text)("device_id").notNull(),
    userAgent: (0, pg.text)("user_agent").notNull(),
    isTrusted: (0, pg.integer)("is_trusted").notNull(),
  },
  (table) => [
    (0, pg.foreignKey)({
      columns: [table.userId],
      foreignColumns: [exports.users.id],
      name: "trusted_devices_user_id_fkey",
    }).onDelete("cascade"),
    (0, pg.primaryKey)({
      columns: [table.userId, table.deviceId],
      name: "trusted_devices_pkey",
    }),
  ]
);
