-- Add notes and tags fields to users table
-- This migration adds two new fields:
-- - notes: text field for admin notes about users
-- - tags: jsonb array field for categorizing users with tags

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb;

-- Add comment to document the fields
COMMENT ON COLUMN "users"."notes" IS 'Admin notes about the user';
COMMENT ON COLUMN "users"."tags" IS 'Array of tags for categorizing users';

