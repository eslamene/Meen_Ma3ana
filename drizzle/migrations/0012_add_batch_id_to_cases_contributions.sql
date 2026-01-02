-- Add batch_id to cases and contributions for rollback support
-- This allows tracking which cases and contributions were created from a batch upload

-- Add batch_id to cases table
ALTER TABLE "cases" 
ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "batch_uploads"("id") ON DELETE SET NULL;

-- Add batch_id to contributions table
ALTER TABLE "contributions" 
ADD COLUMN IF NOT EXISTS "batch_id" uuid REFERENCES "batch_uploads"("id") ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "cases_batch_id_idx" ON "cases"("batch_id");
CREATE INDEX IF NOT EXISTS "contributions_batch_id_idx" ON "contributions"("batch_id");

-- Add comments for documentation
COMMENT ON COLUMN "cases"."batch_id" IS 'Reference to batch_uploads if this case was created from a batch upload';
COMMENT ON COLUMN "contributions"."batch_id" IS 'Reference to batch_uploads if this contribution was created from a batch upload';

