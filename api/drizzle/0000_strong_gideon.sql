CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"role" varchar(16) NOT NULL,
	CONSTRAINT "users_account_unique" UNIQUE("account")
);
