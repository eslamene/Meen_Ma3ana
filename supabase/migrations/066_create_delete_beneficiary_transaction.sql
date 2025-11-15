-- Create transaction function for deleting beneficiary and related documents
-- This ensures atomicity: all operations succeed or all fail

CREATE OR REPLACE FUNCTION delete_beneficiary_with_documents(p_beneficiary_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  name_ar TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_case_count INTEGER;
  v_beneficiary_record RECORD;
BEGIN
  -- 1. Verify beneficiary exists and lock the row
  SELECT * INTO v_beneficiary_record
  FROM beneficiaries
  WHERE beneficiaries.id = p_beneficiary_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Beneficiary not found' USING ERRCODE = 'P0001';
  END IF;
  
  -- 2. Check if beneficiary is assigned to any cases
  -- Cases can be linked via beneficiary_id OR via beneficiary_name/beneficiary_contact
  -- We need to check all possible links
  SELECT COUNT(DISTINCT cases.id)::INTEGER INTO v_case_count
  FROM cases
  WHERE (
    -- Check by beneficiary_id
    (cases.beneficiary_id = p_beneficiary_id AND cases.beneficiary_id IS NOT NULL)
    OR
    -- Check by beneficiary_name
    (cases.beneficiary_name = v_beneficiary_record.name AND cases.beneficiary_name IS NOT NULL)
    OR
    -- Check by beneficiary_contact (mobile number)
    (cases.beneficiary_contact = v_beneficiary_record.mobile_number AND cases.beneficiary_contact IS NOT NULL)
  );
  
  -- Log for debugging (can be removed in production)
  -- RAISE NOTICE 'Found % cases for beneficiary % (name: %, contact: %)', v_case_count, p_beneficiary_id, v_beneficiary_record.name, v_beneficiary_record.mobile_number;
  
  IF v_case_count IS NULL OR v_case_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete beneficiary. This beneficiary is assigned to % case(s). Please remove the beneficiary from all cases before deleting.', COALESCE(v_case_count, 0)
      USING ERRCODE = 'P0002';
  END IF;
  
  -- 3. Delete all document records from database
  DELETE FROM beneficiary_documents
  WHERE beneficiary_documents.beneficiary_id = p_beneficiary_id;
  
  -- 4. Delete the beneficiary
  DELETE FROM beneficiaries
  WHERE beneficiaries.id = p_beneficiary_id;
  
  -- Return the deleted beneficiary data
  RETURN QUERY SELECT
    v_beneficiary_record.id,
    v_beneficiary_record.name,
    v_beneficiary_record.name_ar,
    v_beneficiary_record.created_at;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (service role will use this)
GRANT EXECUTE ON FUNCTION delete_beneficiary_with_documents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_beneficiary_with_documents(UUID) TO service_role;

