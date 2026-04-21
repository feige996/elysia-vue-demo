CREATE TABLE "sys_depts" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer DEFAULT 0 NOT NULL,
	"name" varchar(64) NOT NULL,
	"code" varchar(64) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"leader" varchar(64),
	"phone" varchar(32),
	"email" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"cron" varchar(64) NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"args" text,
	"run_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_run_status" smallint,
	"last_run_message" varchar(255),
	"remark" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" varchar(64),
	"user_id" integer,
	"success" smallint NOT NULL,
	"reason" varchar(255),
	"request_ip" varchar(64),
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sys_users" ADD COLUMN "dept_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_depts_code" ON "sys_depts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_sys_depts_parent_sort" ON "sys_depts" USING btree ("parent_id","sort");--> statement-breakpoint
CREATE INDEX "idx_sys_depts_status" ON "sys_depts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_jobs_name" ON "sys_jobs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_sys_jobs_status" ON "sys_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sys_jobs_deleted_at" ON "sys_jobs" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_sys_login_logs_account_time" ON "sys_login_logs" USING btree ("account","created_at");--> statement-breakpoint
CREATE INDEX "idx_sys_login_logs_user_time" ON "sys_login_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sys_login_logs_success_time" ON "sys_login_logs" USING btree ("success","created_at");