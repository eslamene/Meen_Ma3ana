-- ================================================================
-- CREATE MONTHLY BREAKDOWN VIEW
-- ================================================================
-- This view aggregates monthly statistics from contributions and cases
-- for efficient querying on the landing page
-- ================================================================

BEGIN;

-- Drop the view if it exists
DROP VIEW IF EXISTS monthly_breakdown_view CASCADE;

-- Create the view
CREATE VIEW monthly_breakdown_view AS
WITH monthly_contributions AS (
  SELECT 
    EXTRACT(MONTH FROM c.created_at)::INTEGER AS month,
    EXTRACT(YEAR FROM c.created_at)::INTEGER AS year,
    c.case_id,
    c.amount,
    c.donor_id
  FROM contributions c
  WHERE c.status = 'approved'
),
monthly_stats AS (
  SELECT 
    mc.month,
    mc.year,
    COUNT(DISTINCT mc.case_id) AS total_cases,
    SUM(mc.amount)::NUMERIC AS total_amount,
    COUNT(DISTINCT mc.donor_id) AS contributors
  FROM monthly_contributions mc
  GROUP BY mc.month, mc.year
),
category_monthly AS (
  SELECT 
    mc.month,
    mc.year,
    COALESCE(cc.name_en, cc.name) AS category_name_en,
    COALESCE(cc.name_ar, cc.name) AS category_name_ar,
    cc.id AS category_id,
    SUM(mc.amount)::NUMERIC AS category_amount,
    COUNT(DISTINCT mc.case_id) AS category_cases
  FROM monthly_contributions mc
  INNER JOIN cases cs ON cs.id = mc.case_id AND cs.status = 'published'
  LEFT JOIN case_categories cc ON cc.id = cs.category_id
  GROUP BY mc.month, mc.year, cc.id, cc.name_en, cc.name_ar, cc.name
),
top_categories AS (
  SELECT 
    cm.month,
    cm.year,
    cm.category_name_en,
    cm.category_name_ar,
    cm.category_id,
    cm.category_amount,
    cm.category_cases,
    ROW_NUMBER() OVER (
      PARTITION BY cm.month, cm.year 
      ORDER BY cm.category_amount DESC
    ) AS rank
  FROM category_monthly cm
)
SELECT 
  ms.month,
  ms.year,
  ms.total_cases,
  ms.total_amount,
  ms.contributors,
  tc.category_name_en AS top_category_name_en,
  tc.category_name_ar AS top_category_name_ar,
  tc.category_id AS top_category_id,
  COALESCE(tc.category_amount, 0) AS top_category_amount,
  COALESCE(tc.category_cases, 0) AS top_category_cases
FROM monthly_stats ms
LEFT JOIN top_categories tc ON tc.month = ms.month 
  AND tc.year = ms.year 
  AND tc.rank = 1
ORDER BY ms.year DESC, ms.month DESC;

-- Grant permissions
GRANT SELECT ON monthly_breakdown_view TO authenticated;
GRANT SELECT ON monthly_breakdown_view TO anon;

-- Add comment
COMMENT ON VIEW monthly_breakdown_view IS 'Aggregated monthly statistics for landing page - shows total cases, total amount, contributors, and top category for each month';

COMMIT;

