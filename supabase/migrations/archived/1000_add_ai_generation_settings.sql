-- Migration: Add AI Content Generation Settings to system_config
-- This allows administrators to configure AI generation rules for case titles and descriptions
-- Settings control length, style, tone, and content focus

-- Title Generation Settings
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.title.max_length',
    '80',
    'Maximum character length for AI-generated case titles',
    'الحد الأقصى لطول عناوين الحالات المولدة بالذكاء الاصطناعي',
    'ai'
  ),
  (
    'ai.title.min_length',
    '10',
    'Minimum character length for AI-generated case titles',
    'الحد الأدنى لطول عناوين الحالات المولدة بالذكاء الاصطناعي',
    'ai'
  ),
  (
    'ai.title.style',
    'catchy',
    'Style for AI-generated titles. Options: catchy, emotional, direct, compelling',
    'أسلوب العناوين المولدة بالذكاء الاصطناعي. الخيارات: جذاب، عاطفي، مباشر، مقنع',
    'ai'
  ),
  (
    'ai.title.tone',
    'compassionate',
    'Tone for AI-generated titles. Options: professional, friendly, urgent, hopeful, compassionate',
    'نبرة العناوين المولدة بالذكاء الاصطناعي. الخيارات: مهنية، ودودة، عاجلة، متفائلة، رحيمة',
    'ai'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Description Generation Settings
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.description.max_length',
    '2000',
    'Maximum character length for AI-generated case descriptions',
    'الحد الأقصى لطول أوصاف الحالات المولدة بالذكاء الاصطناعي',
    'ai'
  ),
  (
    'ai.description.min_length',
    '100',
    'Minimum character length for AI-generated case descriptions',
    'الحد الأدنى لطول أوصاف الحالات المولدة بالذكاء الاصطناعي',
    'ai'
  ),
  (
    'ai.description.style',
    'structured',
    'Style for AI-generated descriptions. Options: storytelling, factual, emotional, detailed, structured',
    'أسلوب الأوصاف المولدة بالذكاء الاصطناعي. الخيارات: قصصي، واقعي، عاطفي، مفصل، منظم',
    'ai'
  ),
  (
    'ai.description.tone',
    'compassionate',
    'Tone for AI-generated descriptions. Options: professional, compassionate, urgent, hopeful',
    'نبرة الأوصاف المولدة بالذكاء الاصطناعي. الخيارات: مهنية، رحيمة، عاجلة، متفائلة',
    'ai'
  ),
  (
    'ai.description.structure',
    'paragraph',
    'Structure for AI-generated descriptions. Options: paragraph, structured, narrative',
    'هيكل الأوصاف المولدة بالذكاء الاصطناعي. الخيارات: فقرة، منظم، سردي',
    'ai'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- General AI Generation Settings
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.avoid_long_stories',
    'true',
    'Avoid long stories in AI-generated content. When true, AI will focus on facts and needs rather than lengthy narratives',
    'تجنب القصص الطويلة في المحتوى المولد بالذكاء الاصطناعي. عند التفعيل، سيركز الذكاء الاصطناعي على الحقائق والاحتياجات بدلاً من السرد الطويل',
    'ai'
  ),
  (
    'ai.focus_on_needs',
    'true',
    'Focus on specific needs in AI-generated content. When true, AI will emphasize the specific needs and how donations help',
    'التركيز على الاحتياجات المحددة في المحتوى المولد بالذكاء الاصطناعي. عند التفعيل، سيركز الذكاء الاصطناعي على الاحتياجات المحددة وكيف تساعد التبرعات',
    'ai'
  ),
  (
    'ai.emphasize_impact',
    'true',
    'Emphasize the positive impact of donations in AI-generated content',
    'التأكيد على التأثير الإيجابي للتبرعات في المحتوى المولد بالذكاء الاصطناعي',
    'ai'
  ),
  (
    'ai.include_call_to_action',
    'true',
    'Include a subtle call to action in AI-generated descriptions encouraging donations',
    'تضمين دعوة خفية للعمل في الأوصاف المولدة بالذكاء الاصطناعي تشجع على التبرع',
    'ai'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Content Rules (Dynamic - can be added through UI)
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.rule.location_restriction',
    'Egypt',
    'All cases must be related to this location. AI will only generate content relevant to this location unless explicitly overridden in inputs.',
    'يجب أن تكون جميع الحالات مرتبطة بهذا الموقع. سيولد الذكاء الاصطناعي محتوى متعلق بهذا الموقع فقط ما لم يتم تجاوزه صراحة في المدخلات.',
    'ai'
  ),
  (
    'ai.rule.no_names_unless_provided',
    'true',
    'Do not include any names (person names, place names, etc.) in generated content unless explicitly provided in the inputs. Use generic terms instead.',
    'لا تضع أي أسماء (أسماء أشخاص، أسماء أماكن، إلخ) في المحتوى المولد ما لم يتم توفيرها صراحة في المدخلات. استخدم مصطلحات عامة بدلاً من ذلك.',
    'ai'
  ),
  (
    'ai.rule.no_personal_data_unless_provided',
    'true',
    'Do not include any personal specific data (ages, specific medical conditions, exact addresses, etc.) unless explicitly provided in the inputs. Use general descriptions instead.',
    'لا تضع أي بيانات شخصية محددة (الأعمار، الحالات الطبية المحددة، العناوين الدقيقة، إلخ) ما لم يتم توفيرها صراحة في المدخلات. استخدم أوصاف عامة بدلاً من ذلك.',
    'ai'
  )
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including AI generation settings, API keys, validation rules, and pagination settings';

