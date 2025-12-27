-- ================================================================
-- CREATE CATEGORY SUMMARY VIEW
-- ================================================================
-- This view aggregates category statistics from cases table
-- for efficient querying on the landing page
-- ================================================================

BEGIN;

-- Drop the view if it exists
DROP VIEW IF EXISTS category_summary_view CASCADE;

-- Create the view
CREATE VIEW category_summary_view AS
SELECT 
    cc.id AS category_id,
    COALESCE(cc.name_en, cc.name) AS name_en,
    COALESCE(cc.name_ar, cc.name) AS name_ar,
    COALESCE(cc.description_en, cc.description) AS description_en,
    COALESCE(cc.description_ar, cc.description) AS description_ar,
    cc.icon,
    cc.color,
    COUNT(DISTINCT c.id) AS total_cases,
    COALESCE(SUM(c.current_amount::numeric), 0) AS total_amount,
    CASE 
        WHEN COUNT(DISTINCT c.id) > 0 
        THEN COALESCE(SUM(c.current_amount::numeric), 0) / COUNT(DISTINCT c.id)
        ELSE 0 
    END AS average_per_case
FROM case_categories cc
LEFT JOIN cases c ON c.category_id = cc.id 
    AND c.status = 'published'
WHERE cc.is_active = true
GROUP BY 
    cc.id,
    cc.name_en,
    cc.name_ar,
    cc.name,
    cc.description_en,
    cc.description_ar,
    cc.description,
    cc.icon,
    cc.color
ORDER BY total_amount DESC;

-- Grant permissions
GRANT SELECT ON category_summary_view TO authenticated;
GRANT SELECT ON category_summary_view TO anon;

-- Add comment
COMMENT ON VIEW category_summary_view IS 'Aggregated category statistics for landing page - shows total cases, total amount, and average per case for each active category';

COMMIT;

