-- ============================================
-- CREATE LANDING_CONTACTS TABLE
-- ============================================
-- Table to store contact form submissions from the marketing landing page
-- This table stores inquiries from visitors without requiring authentication

CREATE TABLE IF NOT EXISTS landing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_landing_contacts_created_at ON landing_contacts(created_at DESC);
CREATE INDEX idx_landing_contacts_email ON landing_contacts(email);
-- Note: Date-based queries can use the created_at index efficiently

-- ============================================
-- CREATE RLS POLICIES
-- ============================================
-- Note: This table should be insert-only for anonymous users
-- Only admins should be able to read the data

ALTER TABLE landing_contacts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the contact form)
CREATE POLICY "Anyone can submit contact form" ON landing_contacts
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view contact submissions
CREATE POLICY "Admins can view all contact submissions" ON landing_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rbac_user_roles ur
      JOIN rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
  );

-- No updates or deletes allowed (data integrity)
CREATE POLICY "No updates or deletes" ON landing_contacts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- REFRESH SCHEMA CACHE
-- ============================================

NOTIFY pgrst, 'reload schema';

