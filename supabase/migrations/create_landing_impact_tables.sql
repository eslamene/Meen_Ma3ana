-- Create tables for landing page impact data
-- This migration creates tables to store monthly breakdown, category summary, and success stories

-- Table for monthly breakdown data
CREATE TABLE IF NOT EXISTS landing_monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL UNIQUE,
  month_name TEXT NOT NULL,
  month_name_arabic TEXT NOT NULL,
  total_cases INTEGER NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  contributors INTEGER NOT NULL DEFAULT 0,
  top_category_name TEXT,
  top_category_amount BIGINT DEFAULT 0,
  top_category_cases INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for category summary data
CREATE TABLE IF NOT EXISTS landing_category_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_arabic TEXT NOT NULL,
  total_cases INTEGER NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  average_per_case BIGINT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for success stories
CREATE TABLE IF NOT EXISTS landing_success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  arabic_description TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  contributors INTEGER DEFAULT 0,
  month TEXT,
  is_featured BOOLEAN DEFAULT false,
  students_helped INTEGER,
  families_helped INTEGER,
  beneficiaries INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_landing_monthly_breakdown_month ON landing_monthly_breakdown(month);
CREATE INDEX IF NOT EXISTS idx_landing_category_summary_key ON landing_category_summary(category_key);
CREATE INDEX IF NOT EXISTS idx_landing_success_stories_category ON landing_success_stories(category);
CREATE INDEX IF NOT EXISTS idx_landing_success_stories_featured ON landing_success_stories(is_featured);

-- Enable RLS
ALTER TABLE landing_monthly_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_category_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_success_stories ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read (public data)
CREATE POLICY "Anyone can read monthly breakdown"
  ON landing_monthly_breakdown
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read category summary"
  ON landing_category_summary
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read success stories"
  ON landing_success_stories
  FOR SELECT
  USING (true);

-- Policies: Only authenticated users can modify
CREATE POLICY "Authenticated users can update monthly breakdown"
  ON landing_monthly_breakdown
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert monthly breakdown"
  ON landing_monthly_breakdown
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update category summary"
  ON landing_category_summary
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert category summary"
  ON landing_category_summary
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update success stories"
  ON landing_success_stories
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert success stories"
  ON landing_success_stories
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE landing_monthly_breakdown IS 'Stores monthly impact breakdown for landing page';
COMMENT ON TABLE landing_category_summary IS 'Stores category-wise impact summary for landing page';
COMMENT ON TABLE landing_success_stories IS 'Stores success stories for landing page';

