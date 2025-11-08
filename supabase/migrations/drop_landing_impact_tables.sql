-- Drop the landing impact tables that were created for testing
-- This migration removes the temporary tables and reverts to using cases and contributions

BEGIN;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS landing_success_stories CASCADE;
DROP TABLE IF EXISTS landing_category_summary CASCADE;
DROP TABLE IF EXISTS landing_monthly_breakdown CASCADE;

COMMIT;

-- Note: landing_stats table is kept as it's used for main statistics

