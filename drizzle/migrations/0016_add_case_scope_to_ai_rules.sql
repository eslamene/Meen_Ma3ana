-- Add 'case' as a valid scope value for ai_rules table
-- This allows rules to be scoped specifically to case-related content generation

-- Drop the existing check constraint
ALTER TABLE public.ai_rules
DROP CONSTRAINT IF EXISTS ai_rules_scope_check;

-- Recreate the constraint with 'case' included
ALTER TABLE public.ai_rules
ADD CONSTRAINT ai_rules_scope_check 
CHECK (scope IN ('global', 'module', 'feature', 'tenant', 'user', 'role', 'case'));

COMMENT ON CONSTRAINT ai_rules_scope_check ON public.ai_rules IS 'Ensures scope is one of the valid values: global, module, feature, tenant, user, role, or case';

