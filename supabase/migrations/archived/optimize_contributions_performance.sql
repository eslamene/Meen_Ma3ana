-- ================================================================
-- PERFORMANCE OPTIMIZATION FOR CONTRIBUTIONS API
-- ================================================================
-- This migration creates database views and indexes to optimize
-- contributions queries for production scale (10K+ contributions)
-- ================================================================

-- ================================================================
-- PART 1: Create a view for latest approval status per contribution
-- ================================================================
-- This eliminates the need to fetch all approval_status records
-- and filter in JavaScript. The database does it efficiently.

CREATE OR REPLACE VIEW contribution_latest_status AS
SELECT DISTINCT ON (c.id)
  c.id as contribution_id,
  c.donor_id,
  c.case_id,
  c.amount,
  c.status as contribution_status,
  c.created_at,
  c.updated_at,
  COALESCE(cas.status, 'pending') as approval_status,
  cas.rejection_reason,
  cas.admin_comment,
  cas.updated_at as status_updated_at
FROM contributions c
LEFT JOIN contribution_approval_status cas ON c.id = cas.contribution_id
ORDER BY c.id, cas.created_at DESC NULLS LAST;

-- Add comment for documentation
COMMENT ON VIEW contribution_latest_status IS 
'Materialized view that provides the latest approval status for each contribution. 
Used to optimize filtering and stats queries.';

-- ================================================================
-- PART 2: Create indexes for fast filtering
-- ================================================================

-- Index on approval_status for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_contribution_latest_status_approval 
ON contribution_approval_status(contribution_id, status, created_at DESC);

-- Index on donor_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_contributions_donor_id 
ON contributions(donor_id);

-- Index on case_id for case-specific queries
CREATE INDEX IF NOT EXISTS idx_contributions_case_id 
ON contributions(case_id);

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_contributions_admin_queries 
ON contributions(created_at DESC, donor_id);

-- ================================================================
-- PART 3: Create function for efficient stats calculation
-- ================================================================
-- This function calculates all stats in a single query using aggregation

CREATE OR REPLACE FUNCTION get_contribution_stats(
  p_donor_id UUID DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  total BIGINT,
  pending BIGINT,
  approved BIGINT,
  rejected BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_statuses AS (
    SELECT DISTINCT ON (c.id)
      c.id,
      c.amount,
      COALESCE(cas.status, 'pending') as status
    FROM contributions c
    LEFT JOIN contribution_approval_status cas 
      ON c.id = cas.contribution_id
    WHERE 
      -- Filter by donor if not admin
      (p_is_admin OR c.donor_id = p_donor_id)
    ORDER BY c.id, cas.created_at DESC NULLS LAST
  )
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status IN ('rejected', 'revised')) as rejected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_amount
  FROM latest_statuses;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_contribution_stats IS 
'Calculates contribution statistics (total, pending, approved, rejected, total_amount) 
efficiently in a single query. Supports filtering by donor_id for user-specific stats.
Parameters:
  - p_donor_id: Filter by specific donor (NULL for all)
  - p_is_admin: If true, shows all contributions regardless of donor_id';

-- ================================================================
-- PART 4: Create function for filtered contribution list with pagination
-- ================================================================

-- Drop existing function if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS get_contributions_filtered(TEXT, UUID, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_contributions_filtered(
  p_status TEXT DEFAULT 'all',
  p_donor_id UUID DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  type TEXT,
  donor_id UUID,
  case_id UUID,
  project_id UUID,
  project_cycle_id UUID,
  amount NUMERIC,
  status TEXT,
  notes TEXT,
  anonymous BOOLEAN,
  payment_method TEXT,
  proof_of_payment TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  approval_status TEXT,
  rejection_reason TEXT,
  admin_comment TEXT,
  status_updated_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- First, get the total count for pagination
  WITH filtered_base AS (
    SELECT DISTINCT ON (c.id)
      c.id
    FROM contributions c
    LEFT JOIN contribution_approval_status cas 
      ON c.id = cas.contribution_id
    WHERE 
      -- Filter by donor if not admin
      (p_is_admin OR c.donor_id = p_donor_id)
      -- Filter by approval status
      AND (
        p_status = 'all' 
        OR (p_status = 'pending' AND COALESCE(cas.status, 'pending') = 'pending')
        OR (p_status = 'approved' AND COALESCE(cas.status, 'pending') = 'approved')
        OR (p_status = 'rejected' AND COALESCE(cas.status, 'pending') IN ('rejected', 'revised'))
      )
    ORDER BY c.id, cas.created_at DESC NULLS LAST
  )
  SELECT COUNT(*) INTO v_total_count FROM filtered_base;

  -- Return paginated results with total count
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.type,
    c.donor_id,
    c.case_id,
    c.project_id,
    c.project_cycle_id,
    c.amount,
    c.status,
    c.notes,
    c.anonymous,
    c.payment_method,
    c.proof_of_payment,
    c.created_at,
    c.updated_at,
    COALESCE(cas.status, 'pending') as approval_status,
    cas.rejection_reason,
    cas.admin_comment,
    cas.updated_at as status_updated_at,
    v_total_count as total_count
  FROM contributions c
  LEFT JOIN contribution_approval_status cas 
    ON c.id = cas.contribution_id
  WHERE 
    -- Filter by donor if not admin
    (p_is_admin OR c.donor_id = p_donor_id)
    -- Filter by approval status
    AND (
      p_status = 'all' 
      OR (p_status = 'pending' AND COALESCE(cas.status, 'pending') = 'pending')
      OR (p_status = 'approved' AND COALESCE(cas.status, 'pending') = 'approved')
      OR (p_status = 'rejected' AND COALESCE(cas.status, 'pending') IN ('rejected', 'revised'))
    )
  ORDER BY 
    c.id,
    cas.created_at DESC NULLS LAST,
    CASE 
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN c.created_at
    END DESC,
    CASE 
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN c.created_at
    END ASC,
    CASE 
      WHEN p_sort_by = 'amount' AND p_sort_order = 'desc' THEN c.amount
    END DESC,
    CASE 
      WHEN p_sort_by = 'amount' AND p_sort_order = 'asc' THEN c.amount
    END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_contributions_filtered IS 
'Returns filtered and paginated contributions with their latest approval status.
Performs all filtering, sorting, and pagination in the database for optimal performance.
Parameters:
  - p_status: Filter by status (all/pending/approved/rejected)
  - p_donor_id: Filter by specific donor (NULL for all)
  - p_is_admin: If true, shows all contributions
  - p_limit: Number of results per page
  - p_offset: Pagination offset
  - p_sort_by: Sort column (created_at/amount)
  - p_sort_order: Sort direction (asc/desc)
Returns: Contributions with total_count for pagination';

-- ================================================================
-- PART 5: Grant permissions
-- ================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_contribution_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_contributions_filtered TO authenticated;

-- Grant select on view
GRANT SELECT ON contribution_latest_status TO authenticated;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Test the stats function
-- SELECT * FROM get_contribution_stats(NULL, TRUE);

-- Test the filtered contributions function
-- SELECT * FROM get_contributions_filtered('pending', NULL, TRUE, 10, 0);

-- Check indexes
-- SELECT * FROM pg_indexes WHERE tablename IN ('contributions', 'contribution_approval_status');

