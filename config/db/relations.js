"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustedDevicesRelations =
  exports.loginEntriesRelations =
  exports.usersRelations =
  exports.passwordsRelations =
    void 0;
const relations_1 = require("drizzle-orm/relations");
const schema_1 = require("./schema");
exports.passwordsRelations = (0, relations_1.relations)(
  schema_1.passwords,
  ({ one }) => ({
    user: one(schema_1.users, {
      fields: [schema_1.passwords.userId],
      references: [schema_1.users.id],
    }),
  })
);
exports.usersRelations = (0, relations_1.relations)(
  schema_1.users,
  ({ many }) => ({
    passwords: many(schema_1.passwords),
    loginEntries: many(schema_1.loginEntries),
    trustedDevices: many(schema_1.trustedDevices),
  })
);
exports.loginEntriesRelations = (0, relations_1.relations)(
  schema_1.loginEntries,
  ({ one }) => ({
    user: one(schema_1.users, {
      fields: [schema_1.loginEntries.userId],
      references: [schema_1.users.id],
    }),
  })
);
exports.trustedDevicesRelations = (0, relations_1.relations)(
  schema_1.trustedDevices,
  ({ one }) => ({
    user: one(schema_1.users, {
      fields: [schema_1.trustedDevices.userId],
      references: [schema_1.users.id],
    }),
  })
);
