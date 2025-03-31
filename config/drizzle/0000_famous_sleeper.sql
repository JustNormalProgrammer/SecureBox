-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"login" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_login_key" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "passwords" (
	"id" text PRIMARY KEY NOT NULL,
	"passwordfile" text NOT NULL,
	"logo" text NOT NULL,
	"platform" text NOT NULL,
	"login" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"timestamp" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL,
	"login" text NOT NULL,
	"page" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"user_agent" text NOT NULL,
	"is_trusted" integer NOT NULL,
	CONSTRAINT "trusted_devices_pkey" PRIMARY KEY("user_id","device_id")
);
--> statement-breakpoint
ALTER TABLE "passwords" ADD CONSTRAINT "passwords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_entries" ADD CONSTRAINT "login_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
*/