-- Insert Terms of Service and Privacy Policy content
-- This migration adds actual Terms and Privacy Policy content in markdown format

INSERT INTO system_content (content_key, title_en, title_ar, content_en, content_ar, description, description_ar, is_active, sort_order) VALUES
  (
    'terms_of_service',
    'Terms of Service',
    'شروط الخدمة',
    '# Terms of Service

**Last Updated:** January 2025

## 1. Acceptance of Terms

By accessing and using Meen Ma3ana (the "Platform"), you accept and agree to be bound by the terms and provision of this agreement.

## 2. Description of Service

Meen Ma3ana is a charitable donation platform that connects donors with beneficiaries in need. We facilitate:

- **Case Management:** Publishing and managing charitable cases
- **Donations:** Processing and managing charitable contributions
- **Transparency:** Providing updates and reports on case progress
- **Community Support:** Building a community of compassionate givers

## 3. User Accounts

### 3.1 Account Creation
- You must provide accurate and complete information when creating an account
- You are responsible for maintaining the security of your account
- You must be at least 18 years old to create an account

### 3.2 Account Responsibilities
- You are responsible for all activities under your account
- You must notify us immediately of any unauthorized use
- We reserve the right to suspend or terminate accounts that violate these terms

## 4. Donations

### 4.1 Making Donations
- All donations are voluntary and non-refundable
- Donations are processed securely through our payment partners
- You will receive a confirmation receipt for each donation

### 4.2 Donation Allocation
- Donations are allocated to the specific case or cause you select
- We strive to ensure 100% of your donation reaches the intended beneficiary
- Administrative fees, if any, are clearly disclosed

## 5. Case Management

### 5.1 Case Submission
- Cases must be submitted with accurate and verifiable information
- All cases undergo review before publication
- We reserve the right to reject or remove cases that do not meet our criteria

### 5.2 Case Updates
- We provide regular updates on case progress
- Beneficiaries may receive updates through the platform
- Case status may change based on progress and verification

## 6. Privacy and Data Protection

Your privacy is important to us. Please review our [Privacy Policy](#privacy_policy) for detailed information on how we collect, use, and protect your data.

## 7. Prohibited Activities

You agree not to:

- Use the platform for any illegal or unauthorized purpose
- Attempt to gain unauthorized access to any part of the platform
- Interfere with or disrupt the platform or servers
- Use automated systems to access the platform without permission
- Impersonate any person or entity
- Collect or harvest information about other users

## 8. Intellectual Property

- All content on the platform is protected by copyright and other intellectual property laws
- You may not reproduce, distribute, or create derivative works without permission
- Our trademarks and logos are our exclusive property

## 9. Limitation of Liability

- The platform is provided "as is" without warranties of any kind
- We are not liable for any indirect, incidental, or consequential damages
- Our total liability is limited to the amount you donated in the 12 months preceding the claim

## 10. Modifications to Terms

We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.

## 11. Contact Information

For questions about these Terms of Service, please contact us at:

- **Email:** meen@ma3ana.org
- **Website:** [www.ma3ana.org](https://www.ma3ana.org)

## 12. Governing Law

These terms are governed by the laws of Egypt. Any disputes will be resolved in the courts of Egypt.',
    '# شروط الخدمة

**آخر تحديث:** يناير 2025

## 1. قبول الشروط

من خلال الوصول إلى منصة "مين معانا" واستخدامها، فإنك تقبل وتوافق على الالتزام بشروط وأحكام هذه الاتفاقية.

## 2. وصف الخدمة

مين معانا هي منصة تبرعات خيرية تربط المتبرعين بالمستفيدين المحتاجين. نحن نسهل:

- **إدارة الحالات:** نشر وإدارة الحالات الخيرية
- **التبرعات:** معالجة وإدارة التبرعات الخيرية
- **الشفافية:** توفير التحديثات والتقارير حول تقدم الحالات
- **دعم المجتمع:** بناء مجتمع من المتبرعين المتعاطفين

## 3. حسابات المستخدمين

### 3.1 إنشاء الحساب
- يجب عليك تقديم معلومات دقيقة وكاملة عند إنشاء حساب
- أنت مسؤول عن الحفاظ على أمان حسابك
- يجب أن تكون على الأقل 18 عاماً لإنشاء حساب

### 3.2 مسؤوليات الحساب
- أنت مسؤول عن جميع الأنشطة تحت حسابك
- يجب إخطارنا فوراً بأي استخدام غير مصرح به
- نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط

## 4. التبرعات

### 4.1 إجراء التبرعات
- جميع التبرعات طوعية وغير قابلة للاسترداد
- تتم معالجة التبرعات بأمان من خلال شركاء الدفع لدينا
- ستحصل على إيصال تأكيد لكل تبرع

### 4.2 تخصيص التبرعات
- يتم تخصيص التبرعات للحالة أو القضية المحددة التي تختارها
- نسعى لضمان وصول 100% من تبرعك إلى المستفيد المقصود
- الرسوم الإدارية، إن وجدت، يتم الكشف عنها بوضوح

## 5. إدارة الحالات

### 5.1 تقديم الحالات
- يجب تقديم الحالات بمعلومات دقيقة وقابلة للتحقق
- تخضع جميع الحالات للمراجعة قبل النشر
- نحتفظ بالحق في رفض أو إزالة الحالات التي لا تلبي معاييرنا

### 5.2 تحديثات الحالات
- نقدم تحديثات منتظمة حول تقدم الحالات
- قد يتلقى المستفيدون تحديثات من خلال المنصة
- قد تتغير حالة الحالة بناءً على التقدم والتحقق

## 6. الخصوصية وحماية البيانات

خصوصيتك مهمة بالنسبة لنا. يرجى مراجعة [سياسة الخصوصية](#privacy_policy) للحصول على معلومات مفصلة حول كيفية جمع واستخدام وحماية بياناتك.

## 7. الأنشطة المحظورة

أنت توافق على عدم:

- استخدام المنصة لأي غرض غير قانوني أو غير مصرح به
- محاولة الوصول غير المصرح به إلى أي جزء من المنصة
- التدخل في أو تعطيل المنصة أو الخوادم
- استخدام الأنظمة الآلية للوصول إلى المنصة دون إذن
- انتحال شخصية أي شخص أو كيان
- جمع أو حصاد معلومات حول المستخدمين الآخرين

## 8. الملكية الفكرية

- جميع المحتويات على المنصة محمية بحقوق الطبع والنشر وقوانين الملكية الفكرية الأخرى
- لا يجوز لك إعادة إنتاج أو توزيع أو إنشاء أعمال مشتقة دون إذن
- علاماتنا التجارية وشعاراتنا هي ملكيتنا الحصرية

## 9. الحد من المسؤولية

- يتم توفير المنصة "كما هي" دون ضمانات من أي نوع
- نحن لسنا مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية
- إجمالي مسؤوليتنا محدود بمبلغ التبرع الذي قدمته في الـ 12 شهراً السابقة للمطالبة

## 10. تعديلات الشروط

نحتفظ بالحق في تعديل هذه الشروط في أي وقت. الاستمرار في استخدام المنصة بعد التغييرات يشكل قبولاً للشروط الجديدة.

## 11. معلومات الاتصال

للأسئلة حول شروط الخدمة هذه، يرجى الاتصال بنا على:

- **البريد الإلكتروني:** meen@ma3ana.org
- **الموقع الإلكتروني:** [www.ma3ana.org](https://www.ma3ana.org)

## 12. القانون الحاكم

هذه الشروط تحكمها قوانين مصر. سيتم حل أي نزاعات في محاكم مصر.',
    'Terms of Service document outlining the rules and regulations for using the Meen Ma3ana platform',
    'وثيقة شروط الخدمة التي تحدد القواعد واللوائح لاستخدام منصة مين معانا',
    true,
    1
  ),
  (
    'privacy_policy',
    'Privacy Policy',
    'سياسة الخصوصية',
    '# Privacy Policy

**Last Updated:** January 2025

## 1. Introduction

Meen Ma3ana ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our charitable donation platform.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Information:** Name, email address, phone number, and profile information
- **Donation Information:** Payment details, donation amounts, and case selections
- **Case Information:** Details about cases you submit or manage
- **Communications:** Messages, feedback, and correspondence with us

### 2.2 Automatically Collected Information
- **Usage Data:** Pages visited, time spent, and interaction patterns
- **Device Information:** Browser type, device type, IP address, and operating system
- **Cookies and Tracking:** Information collected through cookies and similar technologies

## 3. How We Use Your Information

We use the collected information for:

- **Service Delivery:** Processing donations, managing cases, and providing platform features
- **Communication:** Sending updates, receipts, and important notifications
- **Improvement:** Analyzing usage to improve our services and user experience
- **Security:** Detecting and preventing fraud, abuse, and security threats
- **Legal Compliance:** Meeting legal obligations and responding to legal requests

## 4. Information Sharing and Disclosure

We do not sell your personal information. We may share information in the following circumstances:

### 4.1 With Your Consent
- When you explicitly authorize us to share information

### 4.2 Service Providers
- With trusted third-party service providers who assist in platform operations
- These providers are contractually obligated to protect your information

### 4.3 Legal Requirements
- When required by law, court order, or government regulation
- To protect our rights, property, or safety, or that of our users

### 4.4 Public Information
- Case information you choose to make public
- Donation amounts may be displayed (with your consent) for transparency

## 5. Data Security

We implement appropriate technical and organizational measures to protect your information:

- **Encryption:** Data is encrypted in transit and at rest
- **Access Controls:** Limited access to personal information on a need-to-know basis
- **Regular Audits:** Security assessments and vulnerability testing
- **Incident Response:** Procedures for responding to security breaches

## 6. Your Rights and Choices

You have the right to:

- **Access:** Request a copy of your personal information
- **Correction:** Update or correct inaccurate information
- **Deletion:** Request deletion of your personal information
- **Portability:** Receive your data in a portable format
- **Opt-Out:** Unsubscribe from marketing communications
- **Account Closure:** Close your account at any time

## 7. Cookies and Tracking Technologies

We use cookies and similar technologies to:

- Remember your preferences and settings
- Analyze platform usage and performance
- Provide personalized content and features
- Support security and fraud prevention

You can control cookies through your browser settings, though this may affect platform functionality.

## 8. Third-Party Links

Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.

## 9. Children''s Privacy

Our platform is not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.

## 10. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information.

## 11. Data Retention

We retain your information for as long as necessary to:

- Provide our services
- Comply with legal obligations
- Resolve disputes and enforce agreements
- Maintain security and prevent fraud

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes by:

- Posting the updated policy on our platform
- Sending an email notification (if you have an account)
- Displaying a prominent notice on the platform

## 13. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:

- **Email:** meen@ma3ana.org
- **Address:** [Your Organization Address]
- **Website:** [www.ma3ana.org](https://www.ma3ana.org)

## 14. Your Consent

By using our platform, you consent to the collection and use of your information as described in this Privacy Policy.',
    '# سياسة الخصوصية

**آخر تحديث:** يناير 2025

## 1. مقدمة

مين معانا ("نحن" أو "خاصتنا") ملتزمة بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وكشف وحماية معلوماتك عند استخدام منصة التبرعات الخيرية الخاصة بنا.

## 2. المعلومات التي نجمعها

### 2.1 المعلومات التي تقدمها
- **معلومات الحساب:** الاسم وعنوان البريد الإلكتروني ورقم الهاتف ومعلومات الملف الشخصي
- **معلومات التبرع:** تفاصيل الدفع ومبالغ التبرع واختيارات الحالات
- **معلومات الحالة:** تفاصيل الحالات التي تقدمها أو تديرها
- **الاتصالات:** الرسائل والملاحظات والمراسلات معنا

### 2.2 المعلومات المجمعة تلقائياً
- **بيانات الاستخدام:** الصفحات التي تمت زيارتها والوقت المستغرق وأنماط التفاعل
- **معلومات الجهاز:** نوع المتصفح ونوع الجهاز وعنوان IP ونظام التشغيل
- **ملفات تعريف الارتباط والتتبع:** المعلومات المجمعة من خلال ملفات تعريف الارتباط والتقنيات المماثلة

## 3. كيفية استخدامنا لمعلوماتك

نستخدم المعلومات المجمعة من أجل:

- **تقديم الخدمة:** معالجة التبرعات وإدارة الحالات وتوفير ميزات المنصة
- **الاتصال:** إرسال التحديثات والإيصالات والإشعارات المهمة
- **التحسين:** تحليل الاستخدام لتحسين خدماتنا وتجربة المستخدم
- **الأمان:** اكتشاف ومنع الاحتيال وإساءة الاستخدام والتهديدات الأمنية
- **الامتثال القانوني:** الوفاء بالالتزامات القانونية والرد على الطلبات القانونية

## 4. مشاركة المعلومات والكشف عنها

لا نبيع معلوماتك الشخصية. قد نشارك المعلومات في الحالات التالية:

### 4.1 بموافقتك
- عندما تأذن لنا صراحة بمشاركة المعلومات

### 4.2 مقدمي الخدمات
- مع مقدمي الخدمات من الأطراف الثالثة الموثوقين الذين يساعدون في عمليات المنصة
- هؤلاء المقدمون ملزمون تعاقدياً بحماية معلوماتك

### 4.3 المتطلبات القانونية
- عندما يقتضي القانون أو أمر المحكمة أو اللوائح الحكومية
- لحماية حقوقنا أو ممتلكاتنا أو سلامتنا، أو سلامة مستخدمينا

### 4.4 المعلومات العامة
- معلومات الحالة التي تختار جعلها عامة
- قد يتم عرض مبالغ التبرع (بموافقتك) للشفافية

## 5. أمان البيانات

ننفذ التدابير التقنية والتنظيمية المناسبة لحماية معلوماتك:

- **التشفير:** يتم تشفير البيانات أثناء النقل وعند الراحة
- **ضوابط الوصول:** وصول محدود للمعلومات الشخصية على أساس الحاجة إلى المعرفة
- **عمليات التدقيق المنتظمة:** تقييمات الأمان واختبار الثغرات الأمنية
- **استجابة الحوادث:** إجراءات للرد على خروقات الأمان

## 6. حقوقك وخياراتك

لديك الحق في:

- **الوصول:** طلب نسخة من معلوماتك الشخصية
- **التصحيح:** تحديث أو تصحيح المعلومات غير الدقيقة
- **الحذف:** طلب حذف معلوماتك الشخصية
- **إمكانية النقل:** استلام بياناتك بتنسيق قابل للنقل
- **إلغاء الاشتراك:** إلغاء الاشتراك من الاتصالات التسويقية
- **إغلاق الحساب:** إغلاق حسابك في أي وقت

## 7. ملفات تعريف الارتباط وتقنيات التتبع

نستخدم ملفات تعريف الارتباط والتقنيات المماثلة لـ:

- تذكر تفضيلاتك وإعداداتك
- تحليل استخدام المنصة والأداء
- توفير المحتوى والميزات المخصصة
- دعم الأمان ومنع الاحتيال

يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات المتصفح، على الرغم من أن هذا قد يؤثر على وظائف المنصة.

## 8. روابط الأطراف الثالثة

قد تحتوي منصتنا على روابط لمواقع الويب التابعة لأطراف ثالثة. نحن لسنا مسؤولين عن ممارسات الخصوصية لهذه المواقع الخارجية. نشجعك على مراجعة سياسات الخصوصية الخاصة بهم.

## 9. خصوصية الأطفال

منصتنا غير مخصصة للأطفال دون سن 18 عاماً. لا نجمع معلومات شخصية من الأطفال عن علم. إذا كنت تعتقد أننا جمعنا معلومات من طفل، يرجى الاتصال بنا فوراً.

## 10. نقل البيانات الدولية

قد يتم نقل معلوماتك ومعالجتها في بلدان غير بلد إقامتك. نضمن وجود ضمانات مناسبة لحماية معلوماتك.

## 11. الاحتفاظ بالبيانات

نحتفظ بمعلوماتك طالما كان ذلك ضرورياً لـ:

- تقديم خدماتنا
- الامتثال للالتزامات القانونية
- حل النزاعات وإنفاذ الاتفاقيات
- الحفاظ على الأمان ومنع الاحتيال

## 12. التغييرات على هذه السياسة

قد نحدث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بالتغييرات المهمة من خلال:

- نشر السياسة المحدثة على منصتنا
- إرسال إشعار بالبريد الإلكتروني (إذا كان لديك حساب)
- عرض إشعار بارز على المنصة

## 13. اتصل بنا

إذا كانت لديك أسئلة أو مخاوف أو طلبات بخصوص سياسة الخصوصية هذه أو معلوماتك الشخصية، يرجى الاتصال بنا:

- **البريد الإلكتروني:** meen@ma3ana.org
- **العنوان:** [عنوان منظمتك]
- **الموقع الإلكتروني:** [www.ma3ana.org](https://www.ma3ana.org)

## 14. موافقتك

باستخدام منصتنا، فإنك توافق على جمع واستخدام معلوماتك كما هو موضح في سياسة الخصوصية هذه.',
    'Privacy Policy document explaining how Meen Ma3ana collects, uses, and protects user data',
    'وثيقة سياسة الخصوصية التي توضح كيفية جمع واستخدام وحماية بيانات المستخدم في مين معانا',
    true,
    2
  )
ON CONFLICT (content_key) 
DO UPDATE SET 
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  content_en = EXCLUDED.content_en,
  content_ar = EXCLUDED.content_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

