DROP TABLE IF EXISTS "generation_variants" CASCADE;
DROP TABLE IF EXISTS "project_assets" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "saved_outputs" CASCADE;
DROP TABLE IF EXISTS "generation_runs" CASCADE;

CREATE TABLE "generation_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "config_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "model" text NOT NULL,
  "prompt_snapshot" text NOT NULL,
  "provider" text NOT NULL,
  "status" text NOT NULL,
  "user_id" text NOT NULL,
  "workspace" text NOT NULL
);

CREATE TABLE "saved_outputs" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "file_size" integer NOT NULL,
  "label" text NOT NULL,
  "mime_type" text NOT NULL,
  "original_name" text NOT NULL,
  "run_id" text NOT NULL REFERENCES "generation_runs"("id") ON DELETE cascade,
  "storage_path" text NOT NULL,
  "user_id" text NOT NULL
);

CREATE TABLE "generation_variants" (
  "id" text PRIMARY KEY NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "error" text,
  "profile" text NOT NULL,
  "prompt" text NOT NULL,
  "result_asset_id" text REFERENCES "saved_outputs"("id") ON DELETE set null,
  "run_id" text NOT NULL REFERENCES "generation_runs"("id") ON DELETE cascade,
  "status" text NOT NULL,
  "task_id" text,
  "variant_index" integer NOT NULL
);

CREATE INDEX "generation_runs_user_id_idx"
  ON "generation_runs" USING btree ("user_id", "created_at");

CREATE INDEX "saved_outputs_run_id_idx"
  ON "saved_outputs" USING btree ("run_id", "created_at");

CREATE INDEX "saved_outputs_user_id_idx"
  ON "saved_outputs" USING btree ("user_id", "created_at");

CREATE INDEX "generation_variants_run_id_idx"
  ON "generation_variants" USING btree ("run_id", "variant_index");

CREATE INDEX "generation_variants_task_id_idx"
  ON "generation_variants" USING btree ("task_id");
