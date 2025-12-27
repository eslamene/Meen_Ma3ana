-- Migration: Migrate AI Settings from system_config to ai_rules
-- This migrates existing AI settings to the new rules-based architecture

-- Migrate title settings
INSERT INTO ai_rules (rule_key, instruction, scope, priority, version, is_active, metadata)
VALUES
  ('title.max_length', 'Generate titles with a maximum length of {{max_length}} characters.', 'global', 10, 1, true, '{"category": "title", "type": "constraint"}'::jsonb),
  ('title.min_length', 'Generate titles with a minimum length of {{min_length}} characters.', 'global', 10, 1, true, '{"category": "title", "type": "constraint"}'::jsonb),
  ('title.style', 'Generate titles in a {{style}} style (catchy, emotional, direct, compelling).', 'global', 20, 1, true, '{"category": "title", "type": "style"}'::jsonb),
  ('title.tone', 'Generate titles with a {{tone}} tone (professional, friendly, urgent, hopeful, compassionate).', 'global', 20, 1, true, '{"category": "title", "type": "tone"}'::jsonb),
  ('title.attention_grabbing', 'Titles should be attention-grabbing and create emotional connection.', 'global', 30, 1, true, '{"category": "title", "type": "guideline"}'::jsonb),
  ('title.communicate_need', 'Titles should clearly communicate the need.', 'global', 30, 1, true, '{"category": "title", "type": "guideline"}'::jsonb),
  ('title.charity_appropriate', 'Titles should be appropriate for a charity platform.', 'global', 30, 1, true, '{"category": "title", "type": "guideline"}'::jsonb),
  ('title.inspire_donation', 'Titles should inspire people to donate.', 'global', 30, 1, true, '{"category": "title", "type": "guideline"}'::jsonb),
  ('title.focus_on_needs', 'Focus on the specific needs and urgency.', 'global', 40, 1, true, '{"category": "title", "type": "guideline", "conditional": true}'::jsonb),
  ('title.emphasize_impact', 'Emphasize the positive impact of donations.', 'global', 40, 1, true, '{"category": "title", "type": "guideline", "conditional": true}'::jsonb),
  ('title.use_only_hint', 'CRITICAL: Use ONLY the information provided in the hint/context. Do NOT add any information that is not explicitly mentioned. Do NOT assume or invent details about the case (e.g., health issues, medical conditions, financial problems, family situations) unless they are explicitly stated in the hint.', 'global', 1, 1, true, '{"category": "title", "type": "restriction", "language": "en"}'::jsonb),
  ('title.use_only_hint.ar', 'مهم جداً: استخدم فقط المعلومات المقدمة في التلميح/السياق. لا تضيف أي معلومات غير مذكورة صراحة. لا تفترض أو تخترع تفاصيل عن الحالة (مثل المشاكل الصحية، الحالات الطبية، المشاكل المالية، الأوضاع العائلية) ما لم تكن مذكورة صراحة في التلميح.', 'global', 1, 1, true, '{"category": "title", "type": "restriction", "language": "ar"}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

-- Migrate description settings
INSERT INTO ai_rules (rule_key, instruction, scope, priority, version, is_active, metadata)
VALUES
  ('description.max_length', 'Generate descriptions with a maximum length of {{max_length}} characters.', 'global', 10, 1, true, '{"category": "description", "type": "constraint"}'::jsonb),
  ('description.min_length', 'Generate descriptions with a minimum length of {{min_length}} characters.', 'global', 10, 1, true, '{"category": "description", "type": "constraint"}'::jsonb),
  ('description.style', 'Generate descriptions in a {{style}} style (storytelling, factual, emotional, detailed, structured).', 'global', 20, 1, true, '{"category": "description", "type": "style"}'::jsonb),
  ('description.tone', 'Generate descriptions with a {{tone}} tone (professional, compassionate, urgent, hopeful).', 'global', 20, 1, true, '{"category": "description", "type": "tone"}'::jsonb),
  ('description.structure', 'Generate descriptions with a {{structure}} structure (paragraph, structured, narrative).', 'global', 20, 1, true, '{"category": "description", "type": "structure"}'::jsonb),
  ('description.explain_situation', 'Descriptions should clearly explain the situation and needs.', 'global', 30, 1, true, '{"category": "description", "type": "guideline"}'::jsonb),
  ('description.charity_appropriate', 'Descriptions should be appropriate for a charity platform.', 'global', 30, 1, true, '{"category": "description", "type": "guideline"}'::jsonb),
  ('description.inspire_donation', 'Descriptions should inspire people to donate.', 'global', 30, 1, true, '{"category": "description", "type": "guideline"}'::jsonb),
  ('description.well_structured', 'Descriptions should be well-structured and easy to read.', 'global', 30, 1, true, '{"category": "description", "type": "guideline"}'::jsonb),
  ('description.avoid_long_stories', 'Avoid long stories - be concise and focused on facts.', 'global', 40, 1, true, '{"category": "description", "type": "guideline", "conditional": true}'::jsonb),
  ('description.focus_on_needs', 'Focus on specific needs and how donations will help.', 'global', 40, 1, true, '{"category": "description", "type": "guideline", "conditional": true}'::jsonb),
  ('description.emphasize_impact', 'Emphasize the positive impact of donations.', 'global', 40, 1, true, '{"category": "description", "type": "guideline", "conditional": true}'::jsonb),
  ('description.include_cta', 'Include a subtle call to action encouraging donations.', 'global', 40, 1, true, '{"category": "description", "type": "guideline", "conditional": true}'::jsonb),
  ('description.use_only_hint', 'CRITICAL: Use ONLY the information provided in the hint/context and title. Do NOT add any information that is not explicitly mentioned. Do NOT assume or invent details about the case (e.g., health issues, medical conditions, financial problems, family situations, specific needs) unless they are explicitly stated in the provided information. Expand on what is provided, but do NOT add new information that wasn''t in the original hint/title.', 'global', 1, 1, true, '{"category": "description", "type": "restriction", "language": "en"}'::jsonb),
  ('description.use_only_hint.ar', 'مهم جداً: استخدم فقط المعلومات المقدمة في التلميح/السياق والعنوان. لا تضيف أي معلومات غير مذكورة صراحة. لا تفترض أو تخترع تفاصيل عن الحالة (مثل المشاكل الصحية، الحالات الطبية، المشاكل المالية، الأوضاع العائلية، الاحتياجات المحددة) ما لم تكن مذكورة صراحة في المعلومات المقدمة. وسع واشرح ما تم توفيره، لكن لا تضيف معلومات جديدة لم تكن في التلميح/العنوان الأصلي.', 'global', 1, 1, true, '{"category": "description", "type": "restriction", "language": "ar"}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

-- Migrate content rules
INSERT INTO ai_rules (rule_key, instruction, scope, priority, version, is_active, metadata)
VALUES
  ('content.location_restriction', 'IMPORTANT: All content must be related to {{location}}. Do not mention other countries or locations unless explicitly provided in the inputs.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "en"}'::jsonb),
  ('content.location_restriction.ar', 'مهم: يجب أن يكون جميع المحتوى متعلقاً بـ{{location}}. لا تذكر دولاً أو مواقع أخرى ما لم يتم توفيرها صراحة في المدخلات.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "ar"}'::jsonb),
  ('content.no_names_unless_provided', 'CRITICAL: Do NOT include any names (person names, place names, organization names, etc.) in the generated content. Use generic terms like "the beneficiary", "the individual", "the family", etc. Only use names if explicitly provided in the inputs.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "en"}'::jsonb),
  ('content.no_names_unless_provided.ar', 'حرج: لا تضع أي أسماء (أسماء أشخاص، أسماء أماكن، أسماء منظمات، إلخ) في المحتوى المولد. استخدم مصطلحات عامة مثل "المستفيد"، "الفرد"، "العائلة"، إلخ. استخدم الأسماء فقط إذا تم توفيرها صراحة في المدخلات.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "ar"}'::jsonb),
  ('content.no_personal_data_unless_provided', 'CRITICAL: Do NOT include any personal specific data (exact ages, specific medical conditions, exact addresses, specific dates, etc.) unless explicitly provided in the inputs. Use general descriptions like "a child", "medical treatment", "a family in need", etc.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "en"}'::jsonb),
  ('content.no_personal_data_unless_provided.ar', 'حرج: لا تضع أي بيانات شخصية محددة (أعمار دقيقة، حالات طبية محددة، عناوين دقيقة، تواريخ محددة، إلخ) ما لم يتم توفيرها صراحة في المدخلات. استخدم أوصاف عامة مثل "طفل"، "علاج طبي"، "عائلة محتاجة"، إلخ.', 'global', 5, 1, true, '{"category": "content", "type": "restriction", "language": "ar"}'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;

-- Migrate parameters from system_config (get current values)
-- Note: This assumes the system_config values exist. If they don't, defaults will be used.
DO $$
DECLARE
  max_length_val TEXT;
  min_length_val TEXT;
  style_val TEXT;
  tone_val TEXT;
  structure_val TEXT;
  location_val TEXT;
BEGIN
  -- Get title parameters
  SELECT config_value INTO max_length_val FROM system_config WHERE config_key = 'ai.title.max_length' LIMIT 1;
  SELECT config_value INTO min_length_val FROM system_config WHERE config_key = 'ai.title.min_length' LIMIT 1;
  SELECT config_value INTO style_val FROM system_config WHERE config_key = 'ai.title.style' LIMIT 1;
  SELECT config_value INTO tone_val FROM system_config WHERE config_key = 'ai.title.tone' LIMIT 1;
  
  -- Insert title parameters
  IF max_length_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('title.max_length', 'max_length', max_length_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF min_length_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('title.min_length', 'min_length', min_length_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF style_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('title.style', 'style', style_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF tone_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('title.tone', 'tone', tone_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  -- Get description parameters
  SELECT config_value INTO max_length_val FROM system_config WHERE config_key = 'ai.description.max_length' LIMIT 1;
  SELECT config_value INTO min_length_val FROM system_config WHERE config_key = 'ai.description.min_length' LIMIT 1;
  SELECT config_value INTO style_val FROM system_config WHERE config_key = 'ai.description.style' LIMIT 1;
  SELECT config_value INTO tone_val FROM system_config WHERE config_key = 'ai.description.tone' LIMIT 1;
  SELECT config_value INTO structure_val FROM system_config WHERE config_key = 'ai.description.structure' LIMIT 1;
  
  -- Insert description parameters
  IF max_length_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('description.max_length', 'max_length', max_length_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF min_length_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('description.min_length', 'min_length', min_length_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF style_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('description.style', 'style', style_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF tone_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('description.tone', 'tone', tone_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  IF structure_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('description.structure', 'structure', structure_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
  
  -- Get location parameter
  SELECT config_value INTO location_val FROM system_config WHERE config_key = 'ai.rule.location_restriction' LIMIT 1;
  
  IF location_val IS NOT NULL THEN
    INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
    VALUES ('content.location_restriction', 'location', location_val)
    ON CONFLICT (rule_key, parameter_key) DO UPDATE SET parameter_value = EXCLUDED.parameter_value;
  END IF;
END $$;

-- Set default parameters if not migrated
INSERT INTO ai_rule_parameters (rule_key, parameter_key, parameter_value)
VALUES
  ('title.max_length', 'max_length', '80'),
  ('title.min_length', 'min_length', '10'),
  ('title.style', 'style', 'catchy'),
  ('title.tone', 'tone', 'compassionate'),
  ('description.max_length', 'max_length', '2000'),
  ('description.min_length', 'min_length', '100'),
  ('description.style', 'style', 'structured'),
  ('description.tone', 'tone', 'compassionate'),
  ('description.structure', 'structure', 'paragraph'),
  ('content.location_restriction', 'location', 'Egypt')
ON CONFLICT (rule_key, parameter_key) DO NOTHING;

-- Migrate conditional rules (based on boolean settings)
DO $$
DECLARE
  focus_on_needs_val TEXT;
  emphasize_impact_val TEXT;
  avoid_long_stories_val TEXT;
  include_cta_val TEXT;
BEGIN
  SELECT config_value INTO focus_on_needs_val FROM system_config WHERE config_key = 'ai.focus_on_needs' LIMIT 1;
  SELECT config_value INTO emphasize_impact_val FROM system_config WHERE config_key = 'ai.emphasize_impact' LIMIT 1;
  SELECT config_value INTO avoid_long_stories_val FROM system_config WHERE config_key = 'ai.avoid_long_stories' LIMIT 1;
  SELECT config_value INTO include_cta_val FROM system_config WHERE config_key = 'ai.include_call_to_action' LIMIT 1;
  
  -- Update conditional rules based on settings
  IF focus_on_needs_val = 'false' THEN
    UPDATE ai_rules SET is_active = false WHERE rule_key IN ('title.focus_on_needs', 'description.focus_on_needs');
  END IF;
  
  IF emphasize_impact_val = 'false' THEN
    UPDATE ai_rules SET is_active = false WHERE rule_key IN ('title.emphasize_impact', 'description.emphasize_impact');
  END IF;
  
  IF avoid_long_stories_val = 'false' THEN
    UPDATE ai_rules SET is_active = false WHERE rule_key = 'description.avoid_long_stories';
  END IF;
  
  IF include_cta_val = 'false' THEN
    UPDATE ai_rules SET is_active = false WHERE rule_key = 'description.include_cta';
  END IF;
END $$;

