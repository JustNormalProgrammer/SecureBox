import { relations } from "drizzle-orm/relations";
import { users, passwords, loginEntries, trustedDevices } from "./schema";

export const passwordsRelations = relations(passwords, ({one}) => ({
	user: one(users, {
		fields: [passwords.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	passwords: many(passwords),
	loginEntries: many(loginEntries),
	trustedDevices: many(trustedDevices),
}));

export const loginEntriesRelations = relations(loginEntries, ({one}) => ({
	user: one(users, {
		fields: [loginEntries.userId],
		references: [users.id]
	}),
}));

export const trustedDevicesRelations = relations(trustedDevices, ({one}) => ({
	user: one(users, {
		fields: [trustedDevices.userId],
		references: [users.id]
	}),
}));