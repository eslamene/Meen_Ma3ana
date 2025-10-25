-- Add database indexes for analytics performance optimization

-- Cases table indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at);
CREATE INDEX IF NOT EXISTS idx_cases_status_created_at ON cases(status, created_at);

-- Contributions table indexes  
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_case_id ON contributions(case_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON contributions(created_at);
CREATE INDEX IF NOT EXISTS idx_contributions_donor_id ON contributions(donor_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status_created_at ON contributions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_contributions_case_status ON contributions(case_id, status);

-- Sponsorships table indexes
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_case_id ON sponsorships(case_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_created_at ON sponsorships(created_at);
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor_id ON sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status_created_at ON sponsorships(status, created_at);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at ON projects(status, created_at);

-- Composite indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_contributions_amount_status ON contributions(amount, status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_cases_target_current_status ON cases(target_amount, current_amount, status);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_contributions_approved ON contributions(created_at, case_id, amount) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_contributions_pending ON contributions(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sponsorships_approved ON sponsorships(created_at, case_id, amount) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_sponsorships_pending ON sponsorships(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cases_published ON cases(created_at, target_amount, current_amount) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_cases_closed ON cases(created_at, target_amount, current_amount) WHERE status = 'closed';
