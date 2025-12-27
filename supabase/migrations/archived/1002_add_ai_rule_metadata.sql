-- Migration: Add AI Rule Metadata
-- This stores rule metadata including template selection logic, input field mappings, and condition definitions
-- All hardcoded logic is moved to database configuration

-- Rule metadata: Template selection logic
-- Format: JSON string with structure: {"templateSelector": "condition_name", "inputFields": ["field1", "field2"]}
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.rule.metadata.no_names_unless_provided',
    '{"templateSelector": "hasName", "inputFields": ["beneficiaryName"]}',
    'Metadata for no_names_unless_provided rule. templateSelector determines which template to use (true/false), inputFields lists which input fields to check.',
    'البيانات الوصفية لقاعدة no_names_unless_provided. templateSelector يحدد القالب المستخدم (true/false)، inputFields يسرد حقول الإدخال للتحقق منها.',
    'ai'
  ),
  (
    'ai.rule.metadata.no_personal_data_unless_provided',
    '{"templateSelector": "hasSpecificData", "inputFields": ["beneficiarySituation", "beneficiaryNeeds", "additionalContext"]}',
    'Metadata for no_personal_data_unless_provided rule. templateSelector determines which template to use (true/false), inputFields lists which input fields to check.',
    'البيانات الوصفية لقاعدة no_personal_data_unless_provided. templateSelector يحدد القالب المستخدم (true/false)، inputFields يسرد حقول الإدخال للتحقق منها.',
    'ai'
  ),
  (
    'ai.rule.metadata.location_restriction',
    '{"valueSource": "location_restriction", "inputFields": ["location"]}',
    'Metadata for location_restriction rule. valueSource specifies which rule key contains the location value, inputFields lists which input fields to check.',
    'البيانات الوصفية لقاعدة location_restriction. valueSource يحدد مفتاح القاعدة الذي يحتوي على قيمة الموقع، inputFields يسرد حقول الإدخال للتحقق منها.',
    'ai'
  ),

-- Condition definitions: Map condition names to input field checks
-- Format: JSON string with structure: {"inputFields": ["field1", "field2"], "operator": "any|all"}
  (
    'ai.rule.condition.hasName',
    '{"inputFields": ["beneficiaryName"], "operator": "any"}',
    'Condition definition: hasName checks if beneficiaryName is provided.',
    'تعريف الشرط: hasName يتحقق مما إذا كان beneficiaryName متوفراً.',
    'ai'
  ),
  (
    'ai.rule.condition.!hasName',
    '{"inputFields": ["beneficiaryName"], "operator": "any", "negate": true}',
    'Condition definition: !hasName checks if beneficiaryName is NOT provided.',
    'تعريف الشرط: !hasName يتحقق مما إذا كان beneficiaryName غير متوفر.',
    'ai'
  ),
  (
    'ai.rule.condition.hasLocation',
    '{"inputFields": ["location"], "operator": "any"}',
    'Condition definition: hasLocation checks if location is provided.',
    'تعريف الشرط: hasLocation يتحقق مما إذا كان location متوفراً.',
    'ai'
  ),
  (
    'ai.rule.condition.!hasLocation',
    '{"inputFields": ["location"], "operator": "any", "negate": true}',
    'Condition definition: !hasLocation checks if location is NOT provided.',
    'تعريف الشرط: !hasLocation يتحقق مما إذا كان location غير متوفر.',
    'ai'
  ),
  (
    'ai.rule.condition.hasSpecificData',
    '{"inputFields": ["beneficiarySituation", "beneficiaryNeeds", "additionalContext"], "operator": "any"}',
    'Condition definition: hasSpecificData checks if any of beneficiarySituation, beneficiaryNeeds, or additionalContext is provided.',
    'تعريف الشرط: hasSpecificData يتحقق مما إذا كان أي من beneficiarySituation أو beneficiaryNeeds أو additionalContext متوفراً.',
    'ai'
  ),
  (
    'ai.rule.condition.!hasSpecificData',
    '{"inputFields": ["beneficiarySituation", "beneficiaryNeeds", "additionalContext"], "operator": "any", "negate": true}',
    'Condition definition: !hasSpecificData checks if none of beneficiarySituation, beneficiaryNeeds, or additionalContext is provided.',
    'تعريف الشرط: !hasSpecificData يتحقق مما إذا لم يكن أي من beneficiarySituation أو beneficiaryNeeds أو additionalContext متوفراً.',
    'ai'
  ),

-- Value source mappings: For rules that need to find values from other rules
  (
    'ai.rule.value_source.location_restriction',
    '{"ruleKeyPattern": "location|country", "excludeValues": ["true", "false"]}',
    'Value source mapping: Finds location value from rules matching pattern, excluding boolean values.',
    'تعيين مصدر القيمة: يجد قيمة الموقع من القواعد المطابقة للنمط، باستثناء القيم المنطقية.',
    'ai'
  )

ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including AI generation settings, API keys, validation rules, pagination settings, AI rule instruction templates, and rule metadata';

