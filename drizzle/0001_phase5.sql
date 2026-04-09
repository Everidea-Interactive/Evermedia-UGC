ALTER TABLE "generation_runs"
  ADD COLUMN IF NOT EXISTS "asset_manifest" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "cancel_requested_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_heartbeat_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "lease_owner" text,
  ADD COLUMN IF NOT EXISTS "parent_run_id" text REFERENCES "generation_runs"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "uploaded_assets" jsonb DEFAULT '[]'::jsonb;

UPDATE "generation_runs"
SET
  "asset_manifest" = COALESCE("asset_manifest", '[]'::jsonb),
  "uploaded_assets" = COALESCE("uploaded_assets", '[]'::jsonb);

ALTER TABLE "generation_runs"
  ALTER COLUMN "asset_manifest" SET NOT NULL,
  ALTER COLUMN "uploaded_assets" SET NOT NULL;

ALTER TABLE "generation_variants"
  ADD COLUMN IF NOT EXISTS "is_hero" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "review_notes" text,
  ADD COLUMN IF NOT EXISTS "review_status" text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS "selected_for_delivery" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "generation_runs_runnable_idx"
  ON "generation_runs" ("status", "lease_expires_at", "created_at");
