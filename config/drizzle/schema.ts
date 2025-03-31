import { pgTable, unique, text, foreignKey, integer, timestamp, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	login: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_login_key").on(table.login),
]);

export const passwords = pgTable("passwords", {
	id: text().primaryKey().notNull(),
	passwordfile: text().notNull(),
	logo: text().notNull(),
	platform: text().notNull(),
	login: text().notNull(),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "passwords_user_id_fkey"
		}).onDelete("cascade"),
]);

export const loginEntries = pgTable("login_entries", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "login_entries_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	userId: text("user_id").notNull(),
	login: text().notNull(),
	page: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "login_entries_user_id_fkey"
		}).onDelete("cascade"),
]);

export const trustedDevices = pgTable("trusted_devices", {
	userId: text("user_id").notNull(),
	deviceId: text("device_id").notNull(),
	userAgent: text("user_agent").notNull(),
	isTrusted: integer("is_trusted").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trusted_devices_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.deviceId], name: "trusted_devices_pkey"}),
]);
