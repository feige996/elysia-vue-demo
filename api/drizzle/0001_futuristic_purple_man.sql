CREATE TABLE "sys_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trace_id" varchar(64),
	"operator_user_id" integer,
	"operator_account" varchar(64),
	"action" varchar(64) NOT NULL,
	"module" varchar(64) NOT NULL,
	"resource" varchar(128) NOT NULL,
	"resource_id" varchar(64),
	"request_method" varchar(16) NOT NULL,
	"request_path" varchar(255) NOT NULL,
	"request_ip" varchar(64),
	"request_user_agent" varchar(512),
	"request_payload" jsonb,
	"response_code" integer NOT NULL,
	"response_message" varchar(255),
	"success" smallint NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text NOT NULL,
	"value_type" smallint DEFAULT 1 NOT NULL,
	"group_name" varchar(64),
	"is_public" smallint DEFAULT 0 NOT NULL,
	"remark" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_dict_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"dict_type_id" integer NOT NULL,
	"label" varchar(64) NOT NULL,
	"value" varchar(64) NOT NULL,
	"tag_type" varchar(32),
	"sort" integer DEFAULT 0 NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"is_default" smallint DEFAULT 0 NOT NULL,
	"remark" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_dict_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"remark" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage" varchar(32) NOT NULL,
	"bucket" varchar(128),
	"object_key" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size" integer NOT NULL,
	"url" varchar(512) NOT NULL,
	"sha256" varchar(64),
	"biz_type" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "sys_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer DEFAULT 0 NOT NULL,
	"name" varchar(64) NOT NULL,
	"route_name" varchar(128) NOT NULL,
	"path" varchar(255) NOT NULL,
	"component" varchar(255),
	"icon" varchar(64),
	"type" smallint NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"visible" smallint DEFAULT 1 NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"permission_code" varchar(128),
	"keep_alive" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(64) NOT NULL,
	"type" smallint NOT NULL,
	"module" varchar(64) NOT NULL,
	"description" varchar(255),
	"status" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_role_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"menu_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "sys_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "sys_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(255),
	"status" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sys_user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "sys_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" varchar(64) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nickname" varchar(64) NOT NULL,
	"email" varchar(128),
	"mobile" varchar(32),
	"avatar_url" varchar(512),
	"status" smallint DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sys_dict_items" ADD CONSTRAINT "sys_dict_items_dict_type_id_sys_dict_types_id_fk" FOREIGN KEY ("dict_type_id") REFERENCES "public"."sys_dict_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_menus" ADD CONSTRAINT "sys_role_menus_role_id_sys_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_menus" ADD CONSTRAINT "sys_role_menus_menu_id_sys_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."sys_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permissions" ADD CONSTRAINT "sys_role_permissions_role_id_sys_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permissions" ADD CONSTRAINT "sys_role_permissions_permission_id_sys_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."sys_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_roles" ADD CONSTRAINT "sys_user_roles_user_id_sys_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_roles" ADD CONSTRAINT "sys_user_roles_role_id_sys_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sys_audit_logs_operator_time" ON "sys_audit_logs" USING btree ("operator_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sys_audit_logs_module_time" ON "sys_audit_logs" USING btree ("module","created_at");--> statement-breakpoint
CREATE INDEX "idx_sys_audit_logs_success_time" ON "sys_audit_logs" USING btree ("success","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_configs_key" ON "sys_configs" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_sys_configs_group_name" ON "sys_configs" USING btree ("group_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_dict_items_type_value" ON "sys_dict_items" USING btree ("dict_type_id","value");--> statement-breakpoint
CREATE INDEX "idx_sys_dict_items_type_sort" ON "sys_dict_items" USING btree ("dict_type_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_dict_types_code" ON "sys_dict_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_sys_files_biz_type" ON "sys_files" USING btree ("biz_type");--> statement-breakpoint
CREATE INDEX "idx_sys_files_created_at" ON "sys_files" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_menus_route_name" ON "sys_menus" USING btree ("route_name");--> statement-breakpoint
CREATE INDEX "idx_sys_menus_parent_sort" ON "sys_menus" USING btree ("parent_id","sort");--> statement-breakpoint
CREATE INDEX "idx_sys_menus_status_visible" ON "sys_menus" USING btree ("status","visible");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_permissions_code" ON "sys_permissions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_sys_permissions_module" ON "sys_permissions" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_role_menus" ON "sys_role_menus" USING btree ("role_id","menu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_role_permissions" ON "sys_role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_roles_code" ON "sys_roles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_sys_roles_status" ON "sys_roles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_user_roles_user_role" ON "sys_user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_sys_user_roles_user_id" ON "sys_user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sys_user_roles_role_id" ON "sys_user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_sys_users_account" ON "sys_users" USING btree ("account");--> statement-breakpoint
CREATE INDEX "idx_sys_users_status" ON "sys_users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sys_users_deleted_at" ON "sys_users" USING btree ("deleted_at");