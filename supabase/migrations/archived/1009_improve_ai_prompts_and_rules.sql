-- Migration: Improve AI Prompts and Rules
-- This improves the prompt structure, removes redundancy, and better organizes rules for clearer AI responses

-- Update Arabic title prompt template with better structure
UPDATE system_config
SET config_value = 'أنت كاتب محترف لمنصة خيرية لجمع التبرعات. قم بإنشاء عنوان {titleStyle} و{titleTone} لحالة جمع تبرعات.

═══════════════════════════════════════════════════════════
معلومات الحالة:
{contextString}
═══════════════════════════════════════════════════════════
{hintEmphasis}
═══════════════════════════════════════════════════════════
المتطلبات الأساسية:
{titleRequirements}
═══════════════════════════════════════════════════════════

قم بإنشاء العنوان فقط، لا شيء آخر:',
  updated_at = NOW()
WHERE config_key = 'ai.prompt.title.template.ar';

-- Update Arabic title hint emphasis template - more concise and clear
UPDATE system_config
SET config_value = '⚠️ مطلب حرج - اقرأ بعناية:

القواعد الصارمة:
1. استخدم فقط المعلومات المقدمة في التلميح أدناه. لا تضيف أي معلومات غير مذكورة صراحة.
2. لا تفترض أو تخترع تفاصيل عن الحالة ما لم تكن مذكورة صراحة في التلميح.
3. إذا ذكر التلميح موضوعاً محدداً، اكتب فقط عن هذا الموضوع - لا تضيف تفاصيل أخرى غير مذكورة.
4. يجب أن يعكس العنوان تحديداً المعلومات الواردة في التلميح فقط.

التلميح/السياق:
{hintParts}

⚠️ تذكر: استخدم فقط ما تم توفيره. لا تضيف معلومات إضافية.',
  updated_at = NOW()
WHERE config_key = 'ai.prompt.title.hint_emphasis.ar';

-- Update English title hint emphasis template - more concise
UPDATE system_config
SET config_value = '⚠️ CRITICAL REQUIREMENT - READ CAREFULLY:

STRICT RULES:
1. Use ONLY the information provided in the hint below. Do NOT add any information that is not explicitly mentioned.
2. Do NOT assume or invent details about the case unless they are explicitly stated in the hint.
3. If the hint mentions a specific topic, write ONLY about that topic - do NOT add other unrelated details.
4. The title MUST specifically reflect ONLY the information in this hint.

HINT/CONTEXT:
{hintParts}

⚠️ REMEMBER: Use ONLY what is provided. Do NOT add extra information.',
  updated_at = NOW()
WHERE config_key = 'ai.prompt.title.hint_emphasis.en';

-- Consolidate and improve Arabic title rules - remove redundancy
-- First, update the use_only_hint rule to be clearer and in Arabic (already updated below, this is redundant)

-- Update Egyptian Colloquial rule to be more concise and include better examples
UPDATE ai_rules
SET instruction = 'مهم جداً: استخدم اللهجة المصرية العامية حصراً. لا تستخدم الفصحى. أمثلة: "عايز" بدلاً من "يريد"، "عندي" بدلاً من "لدي"، "إيه" بدلاً من "ماذا"، "عشان" بدلاً من "لأن"، "في" بدلاً من "يوجد"، "هي" بدلاً من "هي"، "هو" بدلاً من "هو". استخدم لغة طبيعية ومحادثة كما يتحدث المصريون يومياً.',
  updated_at = NOW()
WHERE rule_key = 'title.egyptian_colloquial.ar';

-- Update avoid ordering slang rule to be clearer with better examples
UPDATE ai_rules
SET instruction = 'ممنوع تماماً: لا تستخدم أفعال الأمر أو الأوامر المباشرة. الكلمات الممنوعة: "ساهم"، "شارك"، "شاركنا"، "ساعد"، "تبرع"، "ادعم"، "انضم"، "ساعدنا"، "ادعمنا"، "تبرع الآن"، "ساهم في"، "شارك في".

❌ أمثلة خاطئة: استخدام أفعال الأمر مباشرة مثل "شارك في..." أو "ساهم في..."
✅ أمثلة صحيحة: استخدام لغة وصفية مثل "... يحتاج مساعدتك" أو "... يحتاج دعمك" أو "... يحتاج مساعدتك في..."

استخدم دائماً لغة وصفية ودعوية تشرح الوضع والحاجة بدلاً من الأوامر المباشرة.',
  updated_at = NOW()
WHERE rule_key = 'title.avoid_ordering_slang.ar';

-- Update English version of avoid ordering slang
UPDATE ai_rules
SET instruction = 'ABSOLUTELY FORBIDDEN: Never use ordering, commanding, or imperative verbs in Arabic titles. Prohibited words: "ساهم", "شارك", "شاركنا", "ساعد", "تبرع", "ادعم", "انضم", "ساعدنا", "ادعمنا", "تبرع الآن", "ساهم في", "شارك في".

❌ Wrong: Using imperative verbs directly like "شارك في..." or "ساهم في..."
✅ Correct: Using descriptive language like "... يحتاج مساعدتك" or "... يحتاج دعمك" or "... يحتاج مساعدتك في..."

Always use descriptive, inviting language that explains the situation and need rather than commanding action.',
  updated_at = NOW()
WHERE rule_key = 'title.avoid_ordering_slang';

-- Add a new rule for better Arabic title structure (descriptive, not commanding)
INSERT INTO ai_rules (rule_key, instruction, scope, priority, version, is_active, metadata)
VALUES
  ('title.descriptive_language.ar', 'استخدم لغة وصفية ودعوية في العنوان. بدلاً من الأوامر المباشرة، اشرح الوضع والحاجة بطريقة تثير التعاطف. استخدم عبارات مثل "يحتاج مساعدتك" أو "يحتاج دعمك" بدلاً من أفعال الأمر. اجعل العنوان يشرح الوضع بطريقة طبيعية وتثير الرغبة في المساعدة.', 'global', 3, 1, true, '{"category": "title", "type": "guideline", "language": "ar"}'::jsonb)
ON CONFLICT (rule_key) DO UPDATE SET
  instruction = EXCLUDED.instruction,
  updated_at = NOW();

-- Update title.use_only_hint to be more concise and not duplicate hint emphasis
UPDATE ai_rules
SET instruction = 'استخدم فقط المعلومات المقدمة في التلميح/السياق. لا تضيف معلومات غير مذكورة صراحة.',
  priority = 1,
  updated_at = NOW()
WHERE rule_key = 'title.use_only_hint' AND (metadata->>'language' = 'ar' OR metadata->>'language' IS NULL);

-- Update English version too
UPDATE ai_rules
SET instruction = 'Use ONLY the information provided in the hint/context. Do NOT add information not explicitly mentioned.',
  priority = 1,
  updated_at = NOW()
WHERE rule_key = 'title.use_only_hint' AND metadata->>'language' = 'en';

-- Add Arabic version of communicate_need if it doesn't exist
INSERT INTO ai_rules (rule_key, instruction, scope, priority, version, is_active, metadata)
VALUES
  ('title.communicate_need.ar', 'العناوين يجب أن تكون جذابة، توضح الحاجة بوضوح، وتلهم الناس للتبرع. ركز على الاحتياجات المحددة والإلحاح.', 'global', 30, 1, true, '{"category": "title", "type": "guideline", "language": "ar"}'::jsonb)
ON CONFLICT (rule_key) DO UPDATE SET
  instruction = EXCLUDED.instruction,
  updated_at = NOW();

-- Update English title template to be better structured
UPDATE system_config
SET config_value = 'You are a professional copywriter for a charity fundraising platform. Generate a {titleStyle} and {titleTone} title for a fundraising case.

═══════════════════════════════════════════════════════════
CASE INFORMATION:
{contextString}
═══════════════════════════════════════════════════════════
{hintEmphasis}
═══════════════════════════════════════════════════════════
REQUIREMENTS:
{titleRequirements}
═══════════════════════════════════════════════════════════

Generate only the title, nothing else:',
  updated_at = NOW()
WHERE config_key = 'ai.prompt.title.template.en';

-- Update English hint emphasis to match Arabic structure
UPDATE system_config
SET config_value = '⚠️ CRITICAL REQUIREMENT - READ CAREFULLY:

STRICT RULES:
1. Use ONLY the information provided in the hint below. Do NOT add any information that is not explicitly mentioned.
2. Do NOT assume or invent details about the case unless they are explicitly stated in the hint.
3. If the hint mentions a specific topic, write ONLY about that topic - do NOT add other unrelated details.
4. The title MUST specifically reflect ONLY the information in this hint.

HINT/CONTEXT:
{hintParts}

⚠️ REMEMBER: Use ONLY what is provided. Do NOT add extra information.',
  updated_at = NOW()
WHERE config_key = 'ai.prompt.title.hint_emphasis.en';

-- Comments
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values. AI rules have been moved to ai_rules and ai_rule_parameters tables. AI prompt templates remain in system_config as they are configuration templates, not rules.';

