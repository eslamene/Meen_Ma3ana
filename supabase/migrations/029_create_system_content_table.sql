-- Create system_content table for terms, policies, and other markdown content
CREATE TABLE IF NOT EXISTS system_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE, -- e.g., 'terms_of_service', 'privacy_policy', 'about_us'
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL, -- Markdown content in English
  content_ar TEXT NOT NULL, -- Markdown content in Arabic
  description TEXT, -- Optional description (English)
  description_ar TEXT, -- Optional description (Arabic)
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0, -- For ordering content items
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on content_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_content_key ON system_content(content_key);

-- Create index on is_active for filtering active content
CREATE INDEX IF NOT EXISTS idx_system_content_active ON system_content(is_active);

-- Enable RLS
ALTER TABLE system_content ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active system content (public data)
CREATE POLICY "Anyone can read active system content"
  ON system_content
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can read all system content (including inactive)
CREATE POLICY "Authenticated users can read all system content"
  ON system_content
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update system content
CREATE POLICY "Authenticated users can update system content"
  ON system_content
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert system content
CREATE POLICY "Authenticated users can insert system content"
  ON system_content
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete system content
CREATE POLICY "Authenticated users can delete system content"
  ON system_content
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE system_content IS 'Stores system content like terms of service, privacy policy, etc. in markdown format with bilingual support';

