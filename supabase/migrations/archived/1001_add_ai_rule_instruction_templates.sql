-- Migration: Add AI Rule Instruction Templates
-- This stores instruction templates for AI content rules in the database
-- Templates support placeholders: {value}, {hasName}, {hasLocation}, {hasSpecificData}, {beneficiaryName}

-- Instruction templates for location restriction rule
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.rule.instruction.location_restriction.en',
    'IMPORTANT: All content must be related to {value}. Do not mention other countries or locations unless explicitly provided in the inputs.',
    'English instruction template for location restriction rule. Use {value} placeholder for the location value.',
    'قالب التعليمات باللغة الإنجليزية لقاعدة تقييد الموقع. استخدم العنصر النائب {value} لقيمة الموقع.',
    'ai'
  ),
  (
    'ai.rule.instruction.location_restriction.ar',
    'مهم: يجب أن يكون جميع المحتوى متعلقاً بـ{value}. لا تذكر دولاً أو مواقع أخرى ما لم يتم توفيرها صراحة في المدخلات.',
    'Arabic instruction template for location restriction rule. Use {value} placeholder for the location value.',
    'قالب التعليمات باللغة العربية لقاعدة تقييد الموقع. استخدم العنصر النائب {value} لقيمة الموقع.',
    'ai'
  ),
  (
    'ai.rule.instruction.location_restriction.condition',
    '!hasLocation',
    'Condition for applying this rule: !hasLocation means apply only when location is NOT provided in inputs.',
    'شرط تطبيق هذه القاعدة: !hasLocation يعني التطبيق فقط عندما لا يتم توفير الموقع في المدخلات.',
    'ai'
  ),

-- Instruction templates for no names unless provided rule
  (
    'ai.rule.instruction.no_names_unless_provided.en.true',
    'CRITICAL: Do NOT include any names (person names, place names, organization names, etc.) in the generated content. Use generic terms like "the beneficiary", "the individual", "the family", etc. Only use names if explicitly provided in the inputs.',
    'English instruction template for no names rule when enabled. Applied when no name is provided.',
    'قالب التعليمات باللغة الإنجليزية لقاعدة عدم الأسماء عند التمكين. يتم تطبيقه عندما لا يتم توفير اسم.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_names_unless_provided.en.false',
    'You may use the provided name: {beneficiaryName}. Do not invent or add any other names.',
    'English instruction template for no names rule when name is provided.',
    'قالب التعليمات باللغة الإنجليزية لقاعدة عدم الأسماء عندما يتم توفير الاسم.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_names_unless_provided.ar.true',
    'حرج: لا تضع أي أسماء (أسماء أشخاص، أسماء أماكن، أسماء منظمات، إلخ) في المحتوى المولد. استخدم مصطلحات عامة مثل "المستفيد"، "الفرد"، "العائلة"، إلخ. استخدم الأسماء فقط إذا تم توفيرها صراحة في المدخلات.',
    'Arabic instruction template for no names rule when enabled. Applied when no name is provided.',
    'قالب التعليمات باللغة العربية لقاعدة عدم الأسماء عند التمكين. يتم تطبيقه عندما لا يتم توفير اسم.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_names_unless_provided.ar.false',
    'يمكنك استخدام الاسم المقدم في المدخلات: {beneficiaryName}. لا تخترع أو تضيف أي أسماء أخرى.',
    'Arabic instruction template for no names rule when name is provided.',
    'قالب التعليمات باللغة العربية لقاعدة عدم الأسماء عندما يتم توفير الاسم.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_names_unless_provided.condition',
    'hasName',
    'Condition for applying this rule: hasName checks if beneficiaryName is provided in inputs.',
    'شرط تطبيق هذه القاعدة: hasName يتحقق مما إذا كان beneficiaryName متوفراً في المدخلات.',
    'ai'
  ),

-- Instruction templates for no personal data unless provided rule
  (
    'ai.rule.instruction.no_personal_data_unless_provided.en.true',
    'CRITICAL: Do NOT include any personal specific data (exact ages, specific medical conditions, exact addresses, specific dates, etc.) unless explicitly provided in the inputs. Use general descriptions like "a child", "medical treatment", "a family in need", etc.',
    'English instruction template for no personal data rule when enabled. Applied when no specific data is provided.',
    'قالب التعليمات باللغة الإنجليزية لقاعدة عدم البيانات الشخصية عند التمكين. يتم تطبيقه عندما لا يتم توفير بيانات محددة.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_personal_data_unless_provided.en.false',
    'You may use the specific information provided in the inputs. Do not invent or add any other personal details.',
    'English instruction template for no personal data rule when specific data is provided.',
    'قالب التعليمات باللغة الإنجليزية لقاعدة عدم البيانات الشخصية عندما يتم توفير بيانات محددة.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_personal_data_unless_provided.ar.true',
    'حرج: لا تضع أي بيانات شخصية محددة (أعمار دقيقة، حالات طبية محددة، عناوين دقيقة، تواريخ محددة، إلخ) ما لم يتم توفيرها صراحة في المدخلات. استخدم أوصاف عامة مثل "طفل"، "علاج طبي"، "عائلة محتاجة"، إلخ.',
    'Arabic instruction template for no personal data rule when enabled. Applied when no specific data is provided.',
    'قالب التعليمات باللغة العربية لقاعدة عدم البيانات الشخصية عند التمكين. يتم تطبيقه عندما لا يتم توفير بيانات محددة.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_personal_data_unless_provided.ar.false',
    'يمكنك استخدام المعلومات المحددة المقدمة في المدخلات. لا تخترع أو تضيف أي تفاصيل شخصية أخرى.',
    'Arabic instruction template for no personal data rule when specific data is provided.',
    'قالب التعليمات باللغة العربية لقاعدة عدم البيانات الشخصية عندما يتم توفير بيانات محددة.',
    'ai'
  ),
  (
    'ai.rule.instruction.no_personal_data_unless_provided.condition',
    'hasSpecificData',
    'Condition for applying this rule: hasSpecificData checks if beneficiarySituation, beneficiaryNeeds, or additionalContext is provided.',
    'شرط تطبيق هذه القاعدة: hasSpecificData يتحقق مما إذا كان beneficiarySituation أو beneficiaryNeeds أو additionalContext متوفراً.',
    'ai'
  ),

-- Generic fallback templates for rules without specific templates
  (
    'ai.rule.instruction.generic.en',
    'Rule: {key} = {value}',
    'Generic English instruction template for rules without specific templates. Use {key} and {value} placeholders.',
    'قالب التعليمات العام باللغة الإنجليزية للقواعد بدون قوالب محددة. استخدم العناصر النائبة {key} و {value}.',
    'ai'
  ),
  (
    'ai.rule.instruction.generic.ar',
    'قاعدة: {key} = {value}',
    'Generic Arabic instruction template for rules without specific templates. Use {key} and {value} placeholders.',
    'قالب التعليمات العام باللغة العربية للقواعد بدون قوالب محددة. استخدم العناصر النائبة {key} و {value}.',
    'ai'
  ),
  (
    'ai.rule.instruction.generic.en.boolean',
    'Rule: {key} must be followed',
    'Generic English instruction template for boolean rules without specific templates. Use {key} placeholder.',
    'قالب التعليمات العام باللغة الإنجليزية للقواعد المنطقية بدون قوالب محددة. استخدم العنصر النائب {key}.',
    'ai'
  ),
  (
    'ai.rule.instruction.generic.ar.boolean',
    'قاعدة: يجب اتباع {key}',
    'Generic Arabic instruction template for boolean rules without specific templates. Use {key} placeholder.',
    'قالب التعليمات العام باللغة العربية للقواعد المنطقية بدون قوالب محددة. استخدم العنصر النائب {key}.',
    'ai'
  )

ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including AI generation settings, API keys, validation rules, pagination settings, and AI rule instruction templates';

