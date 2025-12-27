-- =====================================================
-- Create Category Detection Rules Table
-- Allows dynamic configuration of keywords for case categorization
-- =====================================================

CREATE TABLE IF NOT EXISTS category_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key VARCHAR(50) NOT NULL, -- e.g., 'medical', 'education', 'housing'
    keyword VARCHAR(255) NOT NULL, -- The keyword to search for
    is_active BOOLEAN DEFAULT true NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher priority rules are checked first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure no duplicate keywords for the same category
    UNIQUE(category_key, keyword)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_category_key ON category_detection_rules(category_key);
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_keyword ON category_detection_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_category_detection_rules_active ON category_detection_rules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE category_detection_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Anyone can view active category detection rules" ON category_detection_rules;
DROP POLICY IF EXISTS "Admins can view all category detection rules" ON category_detection_rules;
DROP POLICY IF EXISTS "Super admins can manage category detection rules" ON category_detection_rules;

-- Policy: Anyone can view active rules (for public categorization)
CREATE POLICY "Anyone can view active category detection rules" ON category_detection_rules
    FOR SELECT
    USING (is_active = true);

-- Policy: Admins can view all rules
CREATE POLICY "Admins can view all category detection rules" ON category_detection_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name IN ('admin', 'super_admin')
            AND r.is_active = true
        )
    );

-- Policy: Only super_admins can insert/update/delete
CREATE POLICY "Super admins can manage category detection rules" ON category_detection_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name = 'super_admin'
            AND r.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_user_roles ur
            JOIN admin_roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.is_active = true
            AND r.name = 'super_admin'
            AND r.is_active = true
        )
    );

-- Insert initial rules based on existing hardcoded logic
-- Note: These will be migrated to use category_id in migration 054
INSERT INTO category_detection_rules (category_key, keyword, priority, is_active) VALUES
-- Medical Support
('medical', 'مريض', 10, true),
('medical', 'دوا', 10, true),
('medical', 'أدويه', 10, true),
('medical', 'علاج', 10, true),
('medical', 'عمليه', 10, true),
('medical', 'كانسر', 10, true),
('medical', 'مستشفي', 10, true),
('medical', 'أشعه', 10, true),
('medical', 'سنان', 10, true),
('medical', 'ضروس', 10, true),
('medical', 'قلب', 10, true),
('medical', 'حروق', 10, true),
('medical', 'روماتيزم', 10, true),
('medical', 'تخاطب', 10, true),
('medical', 'جلسات', 10, true),
('medical', 'سكر', 10, true),
-- Educational Assistance
('education', 'مدرسه', 10, true),
('education', 'مدارس', 10, true),
('education', 'دروس', 10, true),
('education', 'تعليم', 10, true),
('education', 'مصاريف مدرس', 10, true),
('education', 'لاب توب', 10, true),
('education', 'هندسه', 10, true),
('education', 'ثانويه', 10, true),
('education', 'طلبه', 10, true),
('education', 'أزهر', 10, true),
('education', 'شباب الأزهر', 10, true),
-- Housing & Rent
('housing', 'ايجار', 10, true),
('housing', 'إيجار', 10, true),
('housing', 'بيت', 10, true),
('housing', 'شقه', 10, true),
('housing', 'سقف', 10, true),
('housing', 'ارضيه', 10, true),
('housing', 'مرتبه', 10, true),
('housing', 'كهربا', 10, true),
('housing', 'كهرباء', 10, true),
('housing', 'سباكه', 10, true),
('housing', 'حمام', 10, true),
-- Home Appliances
('appliances', 'تلاجه', 10, true),
('appliances', 'غساله', 10, true),
('appliances', 'بوتاجاز', 10, true),
('appliances', 'مروحه', 10, true),
('appliances', 'فريزر', 10, true),
('appliances', 'كولدير', 10, true),
('appliances', 'دولاب', 10, true),
('appliances', 'شاشه', 10, true),
('appliances', 'سرير', 10, true),
('appliances', 'جهاز', 10, true),
('appliances', 'أنبوبه', 10, true),
('appliances', 'ماكينه', 10, true),
('appliances', 'خياطه', 10, true),
('appliances', 'اوفر', 10, true),
('appliances', 'موبايل', 10, true),
-- Emergency Relief
('emergency', 'دين', 10, true),
('emergency', 'دين حالا', 10, true),
('emergency', 'غارمه', 10, true),
('emergency', 'مطلقه', 10, true),
('emergency', 'أرمله', 10, true),
('emergency', 'أيتام', 10, true),
('emergency', 'يتيم', 10, true),
('emergency', 'بتيم', 10, true),
('emergency', 'المتوفي', 10, true),
('emergency', 'اكفان', 10, true),
-- Livelihood & Business Support
('livelihood', 'مشروع', 10, true),
('livelihood', 'عربيه', 10, true),
('livelihood', 'مقدم', 10, true),
('livelihood', 'موتوسيكل', 10, true),
('livelihood', 'طيور', 10, true),
('livelihood', 'زراعه', 10, true),
-- Social & Community Support
('community', 'جواز', 10, true),
('community', 'حلويات', 10, true),
('community', 'مولد', 10, true),
('community', 'مسجد', 10, true),
('community', 'منبر', 10, true),
('community', 'سجاجيد', 10, true),
('community', 'بنا', 10, true),
('community', 'تجديد', 10, true),
('community', 'افتتاح', 10, true),
-- Basic Needs & Clothing
('basicneeds', 'بطاطين', 10, true),
('basicneeds', 'جواكت', 10, true),
('basicneeds', 'لعب', 10, true),
('basicneeds', 'ميكب', 10, true),
('basicneeds', 'فساتين', 10, true),
('basicneeds', 'لبس', 10, true),
('basicneeds', 'شتوي', 10, true),
('basicneeds', 'نيجيري', 10, true)
ON CONFLICT (category_key, keyword) DO NOTHING;

