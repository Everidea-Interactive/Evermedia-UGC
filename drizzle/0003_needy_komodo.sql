CREATE TABLE IF NOT EXISTS "saved_ideations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_ideations_user_id_idx" ON "saved_ideations" USING btree ("user_id","created_at");
