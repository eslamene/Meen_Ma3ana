-- Migration: Create AI Rules Tables
-- This creates a proper rules-based architecture for AI settings
-- Rules are small, human-written instructions that are combined at runtime

-- Core AI Rules Table
CREATE TABLE IF NOT EXISTS ai_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE, -- Stable logical identifier (e.g., 'title.max_length', 'content.location_restriction')
  instruction TEXT NOT NULL, -- Plain-text instruction for the AI
  scope TEXT NOT NULL DEFAULT 'global', -- 'global', 'module', 'feature', 'tenant', 'user', 'role'
  scope_reference TEXT, -- Optional: module name, feature name, tenant_id, user_id, role_id
  priority INTEGER NOT NULL DEFAULT 100, -- Lower = higher priority (1-1000)
  version INTEGER NOT NULL DEFAULT 1, -- Version for tracking changes
  is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable rule
  metadata JSONB, -- Optional metadata (e.g., language, category, tags)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT ai_rules_scope_check CHECK (scope IN ('global', 'module', 'feature', 'tenant', 'user', 'role')),
  CONSTRAINT ai_rules_priority_check CHECK (priority >= 1 AND priority <= 1000)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_rules_scope ON ai_rules(scope, scope_reference);
CREATE INDEX IF NOT EXISTS idx_ai_rules_active ON ai_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_rules_priority ON ai_rules(priority);
CREATE INDEX IF NOT EXISTS idx_ai_rules_rule_key ON ai_rules(rule_key);

-- AI Rule Parameters Table (for lightweight variable substitution)
CREATE TABLE IF NOT EXISTS ai_rule_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL REFERENCES ai_rules(rule_key) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL, -- e.g., 'max_amount', 'location', 'default_tone'
  parameter_value TEXT NOT NULL, -- The actual value
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one parameter key per rule
  UNIQUE(rule_key, parameter_key)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_rule_parameters_rule_key ON ai_rule_parameters(rule_key);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_ai_rules_updated_at
  BEFORE UPDATE ON ai_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_rules_updated_at();

CREATE TRIGGER trigger_update_ai_rule_parameters_updated_at
  BEFORE UPDATE ON ai_rule_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_rules_updated_at();

-- Comments
COMMENT ON TABLE ai_rules IS 'Core AI rules table. Rules are small, human-written instructions that are combined at runtime into AI system prompts. Rules are ordered by priority and filtered by scope.';
COMMENT ON COLUMN ai_rules.rule_key IS 'Stable logical identifier for the rule (e.g., "title.max_length", "content.location_restriction")';
COMMENT ON COLUMN ai_rules.instruction IS 'Plain-text instruction for the AI. This is what gets added to the system prompt.';
COMMENT ON COLUMN ai_rules.scope IS 'Scope of the rule: global, module, feature, tenant, user, or role';
COMMENT ON COLUMN ai_rules.scope_reference IS 'Optional reference for scoped rules (module name, feature name, tenant_id, user_id, role_id)';
COMMENT ON COLUMN ai_rules.priority IS 'Priority for ordering rules (1-1000, lower = higher priority)';
COMMENT ON COLUMN ai_rules.version IS 'Version number for tracking changes to rules';
COMMENT ON COLUMN ai_rules.is_active IS 'Whether the rule is currently active/enabled';
COMMENT ON COLUMN ai_rules.metadata IS 'Optional JSON metadata (e.g., language, category, tags)';

COMMENT ON TABLE ai_rule_parameters IS 'Parameters for AI rules. Used for lightweight variable substitution in rule instructions (e.g., {{max_amount}}, {{location}}).';
COMMENT ON COLUMN ai_rule_parameters.parameter_key IS 'Parameter key (e.g., "max_amount", "location")';
COMMENT ON COLUMN ai_rule_parameters.parameter_value IS 'Parameter value for substitution';

