CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "config_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_opened_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "project_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "slot_key" text,
  "label" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "storage_path" text NOT NULL,
  "original_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "generation_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "workspace" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "status" text NOT NULL,
  "prompt_snapshot" text NOT NULL,
  "config_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "generation_variants" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL REFERENCES "generation_runs"("id") ON DELETE CASCADE,
  "variant_index" integer NOT NULL,
  "status" text NOT NULL,
  "profile" text NOT NULL,
  "prompt" text NOT NULL,
  "task_id" text,
  "error" text,
  "result_asset_id" text REFERENCES "project_assets"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "projects_user_id_idx"
  ON "projects" ("user_id", "updated_at");

CREATE INDEX IF NOT EXISTS "project_assets_project_id_idx"
  ON "project_assets" ("project_id", "kind", "slot_key");

CREATE INDEX IF NOT EXISTS "project_assets_user_id_idx"
  ON "project_assets" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "generation_runs_project_id_idx"
  ON "generation_runs" ("project_id", "created_at");

CREATE INDEX IF NOT EXISTS "generation_runs_user_id_idx"
  ON "generation_runs" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "generation_variants_run_id_idx"
  ON "generation_variants" ("run_id", "variant_index");

CREATE INDEX IF NOT EXISTS "generation_variants_task_id_idx"
  ON "generation_variants" ("task_id");
