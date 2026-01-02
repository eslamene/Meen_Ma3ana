-- Add lang column to ai_rules table
-- Supports comma-separated language codes (e.g., "EN,AR" or "en,ar")

ALTER TABLE public.ai_rules
ADD COLUMN IF NOT EXISTS lang text NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.ai_rules.lang IS 'Comma-separated language codes (e.g., "EN,AR" or "en,ar"). NULL means applies to all languages.';

-- Create index for filtering by language
CREATE INDEX IF NOT EXISTS idx_ai_rules_lang ON public.ai_rules USING btree (lang) TABLESPACE pg_default;

-- Update existing rules that have language in metadata to use the new lang column
-- Convert single language to comma-separated format if needed
UPDATE public.ai_rules
SET lang = UPPER(TRIM(metadata->>'language'))
WHERE metadata IS NOT NULL 
  AND metadata->>'language' IS NOT NULL
  AND metadata->>'language' != ''
  AND lang IS NULL;

-- Remove language field from metadata JSONB column
UPDATE public.ai_rules
SET metadata = metadata - 'language'
WHERE metadata IS NOT NULL 
  AND metadata ? 'language';

