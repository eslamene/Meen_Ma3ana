-- Migration: Remove AI Settings from system_config
-- All AI settings have been migrated to ai_rules and ai_rule_parameters tables
-- This cleans up the old system_config entries

-- Delete all AI-related entries from system_config
-- This includes:
-- - ai.title.*
-- - ai.description.*
-- - ai.include_call_to_action
-- - ai.avoid_long_stories
-- - ai.focus_on_needs
-- - ai.emphasize_impact
-- - ai.rule.* (all rule-related entries)
-- - ai.prompt.* (all prompt templates)
-- - Any other entries with group_type = 'ai'

DELETE FROM system_config
WHERE config_key LIKE 'ai.%'
   OR group_type = 'ai';

-- Note: API keys (google.gemini.api_key, anthropic.api_key) are kept in system_config
-- as they are configuration values, not AI rules. They remain in the 'google' and 'anthropic' groups.

-- Add comment to document the cleanup
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values. AI rules have been moved to ai_rules and ai_rule_parameters tables.';

