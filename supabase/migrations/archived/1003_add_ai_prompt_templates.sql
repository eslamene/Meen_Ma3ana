-- Migration: Add AI Prompt Templates
-- This stores all AI prompt templates in the database, making the code cleaner and allowing easy updates

-- Title Generation Prompt Templates
INSERT INTO system_config (config_key, config_value, description, description_ar, group_type) VALUES
  (
    'ai.prompt.title.hint_emphasis.en',
    '═══════════════════════════════════════════════════════════
CRITICAL REQUIREMENT - READ CAREFULLY:
The title you generate MUST be directly related to and based ONLY on the following hint/context. 
STRICT RULES:
1. Use ONLY the information provided in the hint below. Do NOT add any information that is not explicitly mentioned.
2. Do NOT assume or invent details about the case (e.g., health issues, medical conditions, financial problems, family situations) unless they are explicitly stated in the hint.
3. If the hint says "marriage of orphan girl", create a title ONLY about marriage/bride - do NOT add health, medical, or other issues.
4. If the hint says "medical treatment", create a title ONLY about medical treatment - do NOT add other unrelated details.
5. Do NOT generate a generic, unrelated, or off-topic title.
6. The title MUST specifically reflect and incorporate ONLY the information in this hint:

{hintParts}

REMEMBER: Use ONLY what is provided. Do NOT add extra information.
═══════════════════════════════════════════════════════════',
    'English hint emphasis template for title generation. Use {hintParts} placeholder for the actual hints.',
    'قالب التأكيد على التلميح باللغة الإنجليزية لتوليد العنوان. استخدم العنصر النائب {hintParts} للتلميحات الفعلية.',
    'ai'
  ),
  (
    'ai.prompt.title.hint_emphasis.ar',
    '═══════════════════════════════════════════════════════════
مطلب حرج - اقرأ بعناية:
يجب أن يكون العنوان الذي تنشئه مرتبطاً مباشرة ومبنياً فقط على التلميح/السياق التالي.
قواعد صارمة:
1. استخدم فقط المعلومات المقدمة في التلميح أدناه. لا تضيف أي معلومات غير مذكورة صراحة.
2. لا تفترض أو تخترع تفاصيل عن الحالة (مثل المشاكل الصحية، الحالات الطبية، المشاكل المالية، الأوضاع العائلية) ما لم تكن مذكورة صراحة في التلميح.
3. إذا قال التلميح "جواز البنت اليتيمة"، أنشئ عنواناً فقط عن الزواج/العروس - لا تضيف مشاكل صحية أو طبية أو غيرها.
4. إذا قال التلميح "علاج طبي"، أنشئ عنواناً فقط عن العلاج الطبي - لا تضيف تفاصيل غير مرتبطة أخرى.
5. لا تنشئ عنواناً عاماً أو غير مرتبط أو خارج الموضوع.
6. يجب أن يعكس العنوان تحديداً المعلومات الواردة فقط في هذا التلميح:

{hintParts}

تذكر: استخدم فقط ما تم توفيره. لا تضيف معلومات إضافية.
═══════════════════════════════════════════════════════════',
    'Arabic hint emphasis template for title generation. Use {hintParts} placeholder for the actual hints.',
    'قالب التأكيد على التلميح باللغة العربية لتوليد العنوان. استخدم العنصر النائب {hintParts} للتلميحات الفعلية.',
    'ai'
  ),
  (
    'ai.prompt.title.template.en',
    'You are a professional copywriter for a charity fundraising platform. Generate a {titleStyle} and {titleTone} title for a fundraising case.

CASE INFORMATION:
{contextString}{hintEmphasis}

Requirements:
- {titleRequirements}
- CRITICAL: The title MUST be directly based on and reflect ONLY the hint/context provided above. 
- Use ONLY the information explicitly provided in the hint. Do NOT add, assume, or invent any details.
- If the hint mentions "marriage of orphan girl", create a title ONLY about marriage/bride - do NOT add health issues, medical conditions, or other problems unless explicitly mentioned.
- If the hint mentions "medical treatment", create a title ONLY about medical treatment - do NOT add other unrelated details.
- Do NOT create a generic title or a title about a different topic.
- Do NOT assume case conditions, health issues, financial problems, or family situations unless explicitly stated in the hint.
- The title should specifically reflect ONLY the case details provided in the hint/context section.
- Do NOT include quotes or special formatting, just return the title text
- Keep it concise and impactful
- Avoid long stories or unnecessary details

Generate only the title, nothing else:',
    'English title generation prompt template. Placeholders: {titleStyle}, {titleTone}, {contextString}, {hintEmphasis}, {titleRequirements}',
    'قالب مطالبة توليد العنوان باللغة الإنجليزية. العناصر النائبة: {titleStyle}, {titleTone}, {contextString}, {hintEmphasis}, {titleRequirements}',
    'ai'
  ),
  (
    'ai.prompt.title.template.ar',
    'أنت كاتب محترف لمنصة خيرية لجمع التبرعات. قم بإنشاء عنوان {titleStyle} و{titleTone} لحالة جمع تبرعات.

معلومات الحالة:
{contextString}{hintEmphasis}

المتطلبات:
- {titleRequirements}
- مهم جداً: يجب أن يكون العنوان مبنياً مباشرة على التلميح/السياق المقدم أعلاه فقط.
- استخدم فقط المعلومات المقدمة صراحة في التلميح. لا تضيف أو تفترض أو تخترع أي تفاصيل.
- إذا ذكر التلميح "جواز البنت اليتيمة"، أنشئ عنواناً فقط عن الزواج/العروس - لا تضيف مشاكل صحية أو حالات طبية أو مشاكل أخرى ما لم تكن مذكورة صراحة.
- إذا ذكر التلميح "علاج طبي"، أنشئ عنواناً فقط عن العلاج الطبي - لا تضيف تفاصيل غير مرتبطة أخرى.
- لا تنشئ عنواناً عاماً أو عنواناً عن موضوع مختلف.
- لا تفترض أوضاع الحالة أو المشاكل الصحية أو المشاكل المالية أو الأوضاع العائلية ما لم تكن مذكورة صراحة في التلميح.
- يجب أن يعكس العنوان تفاصيل الحالة المقدمة فقط في قسم التلميح/السياق.
- لا تضع علامات اقتباس أو تنسيق خاص، فقط أعد العنوان
- اجعله مختصراً ومؤثراً
- تجنب القصص الطويلة أو التفاصيل غير الضرورية

قم بإنشاء العنوان فقط، لا شيء آخر:',
    'Arabic title generation prompt template. Placeholders: {titleStyle}, {titleTone}, {contextString}, {hintEmphasis}, {titleRequirements}',
    'قالب مطالبة توليد العنوان باللغة العربية. العناصر النائبة: {titleStyle}, {titleTone}, {contextString}, {hintEmphasis}, {titleRequirements}',
    'ai'
  ),

-- Description Generation Prompt Templates
  (
    'ai.prompt.description.hint_emphasis.en',
    '═══════════════════════════════════════════════════════════
CRITICAL REQUIREMENT - READ CAREFULLY:
The description you generate MUST be directly related to and based ONLY on the information provided above.
STRICT RULES:
1. Use ONLY the information provided in the hint/context and title above. Do NOT add any information that is not explicitly mentioned.
2. Do NOT assume or invent details about the case (e.g., health issues, medical conditions, financial problems, family situations, specific needs) unless they are explicitly stated in the provided information.
3. If the title/hint mentions "marriage of orphan girl", write ONLY about marriage/bride - do NOT add health issues, medical conditions, or other problems unless explicitly mentioned.
4. If the title/hint mentions "medical treatment", write ONLY about medical treatment - do NOT add other unrelated details.
5. Do NOT create generic content or content about topics not mentioned in the provided information.
6. Expand on what is provided, but do NOT add new information that wasn''t in the original hint/title.

REMEMBER: Use ONLY what is provided. Expand and elaborate on it, but do NOT add extra information.
═══════════════════════════════════════════════════════════',
    'English hint emphasis template for description generation. Use {hintParts} placeholder for the actual hints.',
    'قالب التأكيد على التلميح باللغة الإنجليزية لتوليد الوصف. استخدم العنصر النائب {hintParts} للتلميحات الفعلية.',
    'ai'
  ),
  (
    'ai.prompt.description.hint_emphasis.ar',
    '═══════════════════════════════════════════════════════════
مطلب حرج - اقرأ بعناية:
يجب أن يكون الوصف الذي تنشئه مرتبطاً مباشرة ومبنياً فقط على المعلومات المقدمة أعلاه.
قواعد صارمة:
1. استخدم فقط المعلومات المقدمة في التلميح/السياق والعنوان أعلاه. لا تضيف أي معلومات غير مذكورة صراحة.
2. لا تفترض أو تخترع تفاصيل عن الحالة (مثل المشاكل الصحية، الحالات الطبية، المشاكل المالية، الأوضاع العائلية، الاحتياجات المحددة) ما لم تكن مذكورة صراحة في المعلومات المقدمة.
3. إذا ذكر العنوان/التلميح "جواز البنت اليتيمة"، اكتب فقط عن الزواج/العروس - لا تضيف مشاكل صحية أو حالات طبية أو مشاكل أخرى ما لم تكن مذكورة صراحة.
4. إذا ذكر العنوان/التلميح "علاج طبي"، اكتب فقط عن العلاج الطبي - لا تضيف تفاصيل غير مرتبطة أخرى.
5. لا تنشئ محتوى عاماً أو محتوى عن مواضيع غير مذكورة في المعلومات المقدمة.
6. وسع واشرح ما تم توفيره، لكن لا تضيف معلومات جديدة لم تكن في التلميح/العنوان الأصلي.

تذكر: استخدم فقط ما تم توفيره. وسع واشرح عليه، لكن لا تضيف معلومات إضافية.
═══════════════════════════════════════════════════════════',
    'Arabic hint emphasis template for description generation. Use {hintParts} placeholder for the actual hints.',
    'قالب التأكيد على التلميح باللغة العربية لتوليد الوصف. استخدم العنصر النائب {hintParts} للتلميحات الفعلية.',
    'ai'
  ),
  (
    'ai.prompt.description.template.en',
    'You are a professional copywriter for a charity fundraising platform. Generate a {descriptionStyle} and {descriptionTone} description for a fundraising case.

CASE INFORMATION:
{descriptionContext}{descHintEmphasis}

Requirements:
- {descRequirements}
- CRITICAL: The description MUST be directly based on and reflect ONLY the information provided above. 
- Use ONLY the information explicitly provided in the hint/context and title. Do NOT add, assume, or invent any details.
- If the title/hint mentions "marriage of orphan girl", write ONLY about marriage/bride - do NOT add health issues, medical conditions, or other problems unless explicitly mentioned.
- If the title/hint mentions "medical treatment", write ONLY about medical treatment - do NOT add other unrelated details.
- Do NOT assume case conditions, health issues, financial problems, family situations, or specific needs unless explicitly stated.
- Expand and elaborate on what is provided, but do NOT add new information that wasn''t in the original hint/title.
- Do NOT include quotes or special formatting, just return the description text
- {avoidLongStoriesInstruction}

Generate only the description, nothing else:',
    'English description generation prompt template. Placeholders: {descriptionStyle}, {descriptionTone}, {descriptionContext}, {descHintEmphasis}, {descRequirements}, {avoidLongStoriesInstruction}',
    'قالب مطالبة توليد الوصف باللغة الإنجليزية. العناصر النائبة: {descriptionStyle}, {descriptionTone}, {descriptionContext}, {descHintEmphasis}, {descRequirements}, {avoidLongStoriesInstruction}',
    'ai'
  ),
  (
    'ai.prompt.description.template.ar',
    'أنت كاتب محترف لمنصة خيرية لجمع التبرعات. قم بإنشاء وصف {descriptionStyle} و{descriptionTone} لحالة جمع تبرعات.

معلومات الحالة:
{descriptionContext}{descHintEmphasis}

المتطلبات:
- {descRequirements}
- مهم جداً: يجب أن يكون الوصف مبنياً مباشرة على المعلومات المقدمة أعلاه فقط.
- استخدم فقط المعلومات المقدمة صراحة في التلميح/السياق والعنوان. لا تضيف أو تفترض أو تخترع أي تفاصيل.
- إذا ذكر العنوان/التلميح "جواز البنت اليتيمة"، اكتب فقط عن الزواج/العروس - لا تضيف مشاكل صحية أو حالات طبية أو مشاكل أخرى ما لم تكن مذكورة صراحة.
- إذا ذكر العنوان/التلميح "علاج طبي"، اكتب فقط عن العلاج الطبي - لا تضيف تفاصيل غير مرتبطة أخرى.
- لا تفترض أوضاع الحالة أو المشاكل الصحية أو المشاكل المالية أو الأوضاع العائلية أو الاحتياجات المحددة ما لم تكن مذكورة صراحة.
- وسع واشرح ما تم توفيره، لكن لا تضيف معلومات جديدة لم تكن في التلميح/العنوان الأصلي.
- لا تضع علامات اقتباس أو تنسيق خاص، فقط أعد الوصف
- {avoidLongStoriesInstruction}

قم بإنشاء الوصف فقط، لا شيء آخر:',
    'Arabic description generation prompt template. Placeholders: {descriptionStyle}, {descriptionTone}, {descriptionContext}, {descHintEmphasis}, {descRequirements}, {avoidLongStoriesInstruction}',
    'قالب مطالبة توليد الوصف باللغة العربية. العناصر النائبة: {descriptionStyle}, {descriptionTone}, {descriptionContext}, {descHintEmphasis}, {descRequirements}, {avoidLongStoriesInstruction}',
    'ai'
  )
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_type = EXCLUDED.group_type,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE system_config IS 'Generic key-value store for system configuration values including AI generation settings, API keys, validation rules, pagination settings, AI rule instruction templates, AI rule metadata, and AI prompt templates';

