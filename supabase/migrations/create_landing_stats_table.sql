-- Create landing page stats table
CREATE TABLE IF NOT EXISTS landing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT NOT NULL UNIQUE,
  stat_value BIGINT NOT NULL DEFAULT 0,
  display_format TEXT, -- Optional: for formatting like "10K+", "5,000+", etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on stat_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_landing_stats_key ON landing_stats(stat_key);

-- Insert initial stats with small values
INSERT INTO landing_stats (stat_key, stat_value, display_format) VALUES
  ('total_raised', 0, 'EGP'),
  ('active_cases', 0, ''),
  ('beneficiaries', 0, ''),
  ('contributors', 0, '')
ON CONFLICT (stat_key) DO NOTHING;

-- Enable RLS
ALTER TABLE landing_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read stats (public data)
CREATE POLICY "Anyone can read landing stats"
  ON landing_stats
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can update stats
CREATE POLICY "Authenticated users can update landing stats"
  ON landing_stats
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert stats
CREATE POLICY "Authenticated users can insert landing stats"
  ON landing_stats
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE landing_stats IS 'Stores landing page statistics that can be manually or automatically updated';

