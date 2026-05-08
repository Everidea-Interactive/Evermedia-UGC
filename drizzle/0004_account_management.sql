CREATE TABLE IF NOT EXISTS "app_users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_users_status_idx" ON "app_users" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_roles" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_role_assignments" (
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "user_role_assignments_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_app_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_role_assignments_role_id_idx" ON "user_role_assignments" USING btree ("role_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_role_assignments_user_id_idx" ON "user_role_assignments" USING btree ("user_id","role_id");
