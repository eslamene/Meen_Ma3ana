-- Comprehensive solution for contributions API search and filtering
-- This migration creates a database function that efficiently handles
-- search across contributions with joined tables (cases, users)

-- Create a function to search contributions with proper filtering
CREATE OR REPLACE FUNCTION search_contributions(
    p_user_id UUID DEFAULT NULL,
    p_is_admin BOOLEAN DEFAULT FALSE,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'desc',
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount NUMERIC,
    payment_method TEXT,
    status TEXT,
    proof_of_payment TEXT,
    anonymous BOOLEAN,
    donor_id UUID,
    case_id UUID,
    notes TEXT,
    message TEXT,
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    case_title TEXT,
    donor_email TEXT,
    donor_first_name TEXT,
    donor_last_name TEXT,
    donor_phone TEXT,
    approval_status TEXT,
    approval_rejection_reason TEXT,
    approval_admin_comment TEXT,
    approval_donor_reply TEXT,
    approval_resubmission_count INTEGER,
    approval_created_at TIMESTAMP WITH TIME ZONE,
    approval_updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.type,
        c.amount,
        COALESCE(c.payment_method, c.payment_method_id::TEXT) as payment_method,
        c.status,
        c.proof_of_payment,
        c.anonymous,
        c.donor_id,
        c.case_id,
        c.notes,
        c.message,
        c.proof_url,
        c.created_at,
        c.updated_at,
        -- Joined case data
        cs.title as case_title,
        -- Joined user data
        u.email as donor_email,
        u.first_name as donor_first_name,
        u.last_name as donor_last_name,
        u.phone as donor_phone,
        -- Approval status (get the latest one)
        cas.status as approval_status,
        cas.rejection_reason as approval_rejection_reason,
        cas.admin_comment as approval_admin_comment,
        cas.donor_reply as approval_donor_reply,
        cas.resubmission_count as approval_resubmission_count,
        cas.created_at as approval_created_at,
        cas.updated_at as approval_updated_at
    FROM contributions c
    LEFT JOIN cases cs ON c.case_id = cs.id
    LEFT JOIN users u ON c.donor_id = u.id
    LEFT JOIN LATERAL (
        SELECT *
        FROM contribution_approval_status
        WHERE contribution_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) cas ON true
    WHERE 
        -- User filtering (if not admin, only show their own contributions)
        (p_is_admin OR c.donor_id = p_user_id)
        -- Status filtering
        AND (
            p_status IS NULL 
            OR p_status = 'all'
            OR (
                CASE p_status
                    WHEN 'approved' THEN cas.status = 'approved'
                    WHEN 'rejected' THEN cas.status IN ('rejected', 'revised')
                    WHEN 'pending' THEN (cas.status IS NULL OR cas.status = 'pending')
                    ELSE true
                END
            )
        )
        -- Date range filtering
        AND (p_date_from IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to IS NULL OR c.created_at <= p_date_to)
        -- Search filtering (across case title, donor name, donor email)
        AND (
            p_search IS NULL 
            OR p_search = ''
            OR (
                cs.title ILIKE '%' || p_search || '%'
                OR u.email ILIKE '%' || p_search || '%'
                OR u.first_name ILIKE '%' || p_search || '%'
                OR u.last_name ILIKE '%' || p_search || '%'
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE '%' || p_search || '%'
            )
        )
    ORDER BY
        CASE WHEN p_sort_order = 'asc' THEN
            CASE p_sort_by
                WHEN 'amount' THEN c.amount
                WHEN 'created_at' THEN c.created_at
                WHEN 'case_title' THEN cs.title
                ELSE c.created_at
            END
        END ASC,
        CASE WHEN p_sort_order != 'asc' THEN
            CASE p_sort_by
                WHEN 'amount' THEN c.amount
                WHEN 'created_at' THEN c.created_at
                WHEN 'case_title' THEN cs.title
                ELSE c.created_at
            END
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to count contributions (for pagination)
CREATE OR REPLACE FUNCTION count_contributions(
    p_user_id UUID DEFAULT NULL,
    p_is_admin BOOLEAN DEFAULT FALSE,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM contributions c
    LEFT JOIN cases cs ON c.case_id = cs.id
    LEFT JOIN users u ON c.donor_id = u.id
    LEFT JOIN LATERAL (
        SELECT *
        FROM contribution_approval_status
        WHERE contribution_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) cas ON true
    WHERE 
        (p_is_admin OR c.donor_id = p_user_id)
        AND (
            p_status IS NULL 
            OR p_status = 'all'
            OR (
                CASE p_status
                    WHEN 'approved' THEN cas.status = 'approved'
                    WHEN 'rejected' THEN cas.status IN ('rejected', 'revised')
                    WHEN 'pending' THEN (cas.status IS NULL OR cas.status = 'pending')
                    ELSE true
                END
            )
        )
        AND (p_date_from IS NULL OR c.created_at >= p_date_from)
        AND (p_date_to IS NULL OR c.created_at <= p_date_to)
        AND (
            p_search IS NULL 
            OR p_search = ''
            OR (
                cs.title ILIKE '%' || p_search || '%'
                OR u.email ILIKE '%' || p_search || '%'
                OR u.first_name ILIKE '%' || p_search || '%'
                OR u.last_name ILIKE '%' || p_search || '%'
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE '%' || p_search || '%'
            )
        );
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_contributions TO authenticated;
GRANT EXECUTE ON FUNCTION count_contributions TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_contributions IS 'Efficiently search and filter contributions with joined case and user data. Supports search across case titles and donor information.';
COMMENT ON FUNCTION count_contributions IS 'Count contributions matching the same filters as search_contributions for pagination support.';

