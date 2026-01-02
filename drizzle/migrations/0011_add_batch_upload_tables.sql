-- Add batch upload management tables
-- This migration creates tables for managing batch case and contribution uploads:
-- - batch_uploads: Tracks batch upload sessions
-- - batch_upload_items: Individual items in a batch (cases/contributions)
-- - nickname_mappings: Maps contributor nicknames to users (for future use)

-- Batch uploads table
CREATE TABLE IF NOT EXISTS "batch_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "source_file" text,
  "status" text NOT NULL DEFAULT 'pending',
  "total_items" integer NOT NULL DEFAULT 0,
  "processed_items" integer NOT NULL DEFAULT 0,
  "successful_items" integer NOT NULL DEFAULT 0,
  "failed_items" integer NOT NULL DEFAULT 0,
  "error_summary" jsonb,
  "metadata" jsonb,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);

-- Batch upload items table
CREATE TABLE IF NOT EXISTS "batch_upload_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "batch_uploads"("id") ON DELETE CASCADE,
  "row_number" integer NOT NULL,
  "case_number" text NOT NULL,
  "case_title" text NOT NULL,
  "contributor_nickname" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "month" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id"),
  "case_id" uuid REFERENCES "cases"("id"),
  "contribution_id" uuid REFERENCES "contributions"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "error_message" text,
  "mapping_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Nickname mappings table (for future use)
CREATE TABLE IF NOT EXISTS "nickname_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nickname" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "batch_uploads_status_idx" ON "batch_uploads"("status");
CREATE INDEX IF NOT EXISTS "batch_uploads_created_by_idx" ON "batch_uploads"("created_by");
CREATE INDEX IF NOT EXISTS "batch_uploads_created_at_idx" ON "batch_uploads"("created_at");

CREATE INDEX IF NOT EXISTS "batch_upload_items_batch_id_idx" ON "batch_upload_items"("batch_id");
CREATE INDEX IF NOT EXISTS "batch_upload_items_status_idx" ON "batch_upload_items"("status");
CREATE INDEX IF NOT EXISTS "batch_upload_items_user_id_idx" ON "batch_upload_items"("user_id");
CREATE INDEX IF NOT EXISTS "batch_upload_items_case_id_idx" ON "batch_upload_items"("case_id");
CREATE INDEX IF NOT EXISTS "batch_upload_items_case_number_idx" ON "batch_upload_items"("case_number");

CREATE INDEX IF NOT EXISTS "nickname_mappings_nickname_idx" ON "nickname_mappings"("nickname");
CREATE INDEX IF NOT EXISTS "nickname_mappings_user_id_idx" ON "nickname_mappings"("user_id");

-- Add comments for documentation
COMMENT ON TABLE "batch_uploads" IS 'Tracks batch upload sessions for cases and contributions';
COMMENT ON TABLE "batch_upload_items" IS 'Individual items (cases/contributions) in a batch upload';
COMMENT ON TABLE "nickname_mappings" IS 'Maps contributor nicknames to user accounts for auto-mapping';

COMMENT ON COLUMN "batch_uploads"."status" IS 'pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN "batch_upload_items"."status" IS 'pending, mapped, case_created, contribution_created, failed';

