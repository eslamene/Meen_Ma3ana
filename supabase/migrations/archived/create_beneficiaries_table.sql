-- ============================================
-- CREATE BENEFICIARIES TABLE
-- ============================================
-- Table to store beneficiary profiles for recurring cases
-- Beneficiaries are identified by name + mobile number or national ID

CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  name_ar TEXT, -- Arabic name
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Contact Information
  mobile_number TEXT,
  email TEXT,
  alternative_contact TEXT,
  
  -- Identification
  national_id TEXT, -- National ID or passport number
  id_type TEXT DEFAULT 'national_id' CHECK (id_type IN ('national_id', 'passport', 'other')),
  
  -- Location
  address TEXT,
  city TEXT,
  governorate TEXT,
  country TEXT DEFAULT 'Egypt',
  
  -- Medical/Social Information
  medical_condition TEXT, -- Primary medical condition
  social_situation TEXT, -- Social/financial situation
  family_size INTEGER,
  dependents INTEGER,
  
  -- Status & Verification
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Metadata
  notes TEXT,
  tags TEXT[], -- For categorization (e.g., 'chronic_illness', 'orphan', 'elderly')
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Tracking
  total_cases INTEGER DEFAULT 0, -- Total number of cases for this beneficiary
  active_cases INTEGER DEFAULT 0, -- Currently active cases
  total_amount_received DECIMAL(15, 2) DEFAULT 0, -- Total amount received across all cases
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_mobile_natid UNIQUE NULLS NOT DISTINCT (mobile_number, national_id),
  CONSTRAINT at_least_one_identifier CHECK (mobile_number IS NOT NULL OR national_id IS NOT NULL)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_beneficiaries_name ON beneficiaries(name);
CREATE INDEX idx_beneficiaries_mobile ON beneficiaries(mobile_number) WHERE mobile_number IS NOT NULL;
CREATE INDEX idx_beneficiaries_national_id ON beneficiaries(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX idx_beneficiaries_city ON beneficiaries(city);
CREATE INDEX idx_beneficiaries_tags ON beneficiaries USING gin(tags);
CREATE INDEX idx_beneficiaries_is_verified ON beneficiaries(is_verified);
CREATE INDEX idx_beneficiaries_created_at ON beneficiaries(created_at DESC);

-- Full-text search index for name
CREATE INDEX idx_beneficiaries_name_search ON beneficiaries USING gin(to_tsvector('english', name));

-- ============================================
-- ADD BENEFICIARY LINK TO CASES TABLE
-- ============================================

ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL;

CREATE INDEX idx_cases_beneficiary_id ON cases(beneficiary_id) WHERE beneficiary_id IS NOT NULL;

-- ============================================
-- CREATE TRIGGER FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_beneficiaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beneficiaries_updated_at
  BEFORE UPDATE ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiaries_updated_at();

-- ============================================
-- CREATE TRIGGER TO UPDATE CASE COUNTS
-- ============================================

CREATE OR REPLACE FUNCTION update_beneficiary_case_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new case is linked to a beneficiary
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.beneficiary_id IS NOT NULL THEN
    UPDATE beneficiaries
    SET 
      total_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = NEW.beneficiary_id
      ),
      active_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = NEW.beneficiary_id 
        AND status IN ('active', 'pending', 'published')
      )
    WHERE id = NEW.beneficiary_id;
  END IF;
  
  -- When a case is unlinked from a beneficiary
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.beneficiary_id IS NOT NULL THEN
    UPDATE beneficiaries
    SET 
      total_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = OLD.beneficiary_id
      ),
      active_cases = (
        SELECT COUNT(*) 
        FROM cases 
        WHERE beneficiary_id = OLD.beneficiary_id 
        AND status IN ('active', 'pending', 'published')
      )
    WHERE id = OLD.beneficiary_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beneficiary_case_counts
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiary_case_counts();

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything
CREATE POLICY "Admins can manage all beneficiaries" ON beneficiaries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
    )
  );

-- All authenticated users can view beneficiaries
CREATE POLICY "Authenticated users can view beneficiaries" ON beneficiaries
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- REFRESH SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';

