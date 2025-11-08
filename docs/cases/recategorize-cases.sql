-- ================================================================
-- RECATEGORIZE EXISTING CASES
-- ================================================================
-- This script recategorizes existing cases based on their Arabic titles
-- using the same categorization logic as generate-cases-from-csv.js
--
-- Run this AFTER consolidate-categories.sql to ensure all cases
-- are assigned to the correct canonical categories.
-- ================================================================

BEGIN;

DO $$
DECLARE
    -- Canonical category IDs
    canonical_medical UUID;
    canonical_education UUID;
    canonical_housing UUID;
    canonical_appliances UUID;
    canonical_emergency UUID;
    canonical_livelihood UUID;
    canonical_community UUID;
    canonical_basicneeds UUID;
    canonical_other UUID;
    
    -- Case variables
    case_record RECORD;
    new_category_id UUID;
    cases_updated INTEGER := 0;
    cases_skipped INTEGER := 0;
BEGIN
    -- Get canonical category IDs
    SELECT id INTO canonical_medical FROM case_categories WHERE COALESCE(name_en, name) = 'Medical Support' LIMIT 1;
    SELECT id INTO canonical_education FROM case_categories WHERE COALESCE(name_en, name) = 'Educational Assistance' LIMIT 1;
    SELECT id INTO canonical_housing FROM case_categories WHERE COALESCE(name_en, name) = 'Housing & Rent' LIMIT 1;
    SELECT id INTO canonical_appliances FROM case_categories WHERE COALESCE(name_en, name) = 'Home Appliances' LIMIT 1;
    SELECT id INTO canonical_emergency FROM case_categories WHERE COALESCE(name_en, name) = 'Emergency Relief' LIMIT 1;
    SELECT id INTO canonical_livelihood FROM case_categories WHERE COALESCE(name_en, name) = 'Livelihood & Business' LIMIT 1;
    SELECT id INTO canonical_community FROM case_categories WHERE COALESCE(name_en, name) = 'Community & Social' LIMIT 1;
    SELECT id INTO canonical_basicneeds FROM case_categories WHERE COALESCE(name_en, name) = 'Basic Needs & Clothing' LIMIT 1;
    SELECT id INTO canonical_other FROM case_categories WHERE COALESCE(name_en, name) = 'Other Support' LIMIT 1;
    
    -- Ensure all canonical categories exist
    IF canonical_medical IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Medical Support', 'Medical Support', 'الدعم الطبي', 'Emergency medical expenses, treatments, medications, and ongoing care', 'Emergency medical expenses, treatments, medications, and ongoing care', 'النفقات الطبية الطارئة والعلاجات والأدوية والرعاية المستمرة', true)
        RETURNING id INTO canonical_medical;
    END IF;
    
    IF canonical_education IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Educational Assistance', 'Educational Assistance', 'المساعدة التعليمية', 'School fees, supplies, tutoring, and educational support', 'School fees, supplies, tutoring, and educational support', 'الرسوم الدراسية والمستلزمات والدروس الخصوصية والدعم التعليمي', true)
        RETURNING id INTO canonical_education;
    END IF;
    
    IF canonical_housing IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Housing & Rent', 'Housing & Rent', 'السكن والإيجار', 'Rent assistance, housing repairs, and utility bills', 'Rent assistance, housing repairs, and utility bills', 'مساعدة الإيجار وإصلاحات السكن وفواتير الخدمات', true)
        RETURNING id INTO canonical_housing;
    END IF;
    
    IF canonical_appliances IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Home Appliances', 'Home Appliances', 'الأجهزة المنزلية', 'Refrigerators, washing machines, stoves, and essential home appliances', 'Refrigerators, washing machines, stoves, and essential home appliances', 'الثلاجات والغسالات والمواقد والأجهزة المنزلية الأساسية', true)
        RETURNING id INTO canonical_appliances;
    END IF;
    
    IF canonical_emergency IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Emergency Relief', 'Emergency Relief', 'الإغاثة الطارئة', 'Emergency support for widows, orphans, and families in crisis', 'Emergency support for widows, orphans, and families in crisis', 'الدعم الطارئ للأرامل والأيتام والأسر في الأزمات', true)
        RETURNING id INTO canonical_emergency;
    END IF;
    
    IF canonical_livelihood IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Livelihood & Business', 'Livelihood & Business', 'الدعم المعيشي والتجاري', 'Livelihood & Business category', 'Livelihood & Business category', 'الدعم المعيشي والتجاري', true)
        RETURNING id INTO canonical_livelihood;
    END IF;
    
    IF canonical_community IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Community & Social', 'Community & Social', 'الدعم المجتمعي والاجتماعي', 'Community & Social category', 'Community & Social category', 'الدعم المجتمعي والاجتماعي', true)
        RETURNING id INTO canonical_community;
    END IF;
    
    IF canonical_basicneeds IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Basic Needs & Clothing', 'Basic Needs & Clothing', 'الاحتياجات الأساسية والملابس', 'Basic Needs & Clothing category', 'Basic Needs & Clothing category', 'الاحتياجات الأساسية والملابس', true)
        RETURNING id INTO canonical_basicneeds;
    END IF;
    
    IF canonical_other IS NULL THEN
        INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active)
        VALUES ('Other Support', 'Other Support', 'دعم آخر', 'Other Support category', 'Other Support category', 'دعم آخر', true)
        RETURNING id INTO canonical_other;
    END IF;
    
    -- Loop through all cases and recategorize based on title_ar
    FOR case_record IN 
        SELECT id, title_ar, category_id 
        FROM cases
        WHERE title_ar IS NOT NULL AND title_ar != ''
    LOOP
        new_category_id := NULL;
        
        -- Categorize based on Arabic title (same logic as generate-cases-from-csv.js)
        -- Medical Support
        IF case_record.title_ar ILIKE '%مريض%' OR case_record.title_ar ILIKE '%دوا%' OR 
           case_record.title_ar ILIKE '%أدويه%' OR case_record.title_ar ILIKE '%علاج%' OR 
           case_record.title_ar ILIKE '%عمليه%' OR case_record.title_ar ILIKE '%كانسر%' OR
           case_record.title_ar ILIKE '%مستشفي%' OR case_record.title_ar ILIKE '%أشعه%' OR 
           case_record.title_ar ILIKE '%سنان%' OR case_record.title_ar ILIKE '%ضروس%' OR 
           case_record.title_ar ILIKE '%قلب%' OR case_record.title_ar ILIKE '%حروق%' OR
           case_record.title_ar ILIKE '%روماتيزم%' OR case_record.title_ar ILIKE '%تخاطب%' OR 
           case_record.title_ar ILIKE '%جلسات%' OR case_record.title_ar ILIKE '%سكر%' OR 
           case_record.title_ar ILIKE '%شهريات%' THEN
            new_category_id := canonical_medical;
        
        -- Educational Assistance
        ELSIF case_record.title_ar ILIKE '%مدرسه%' OR case_record.title_ar ILIKE '%مدارس%' OR 
              case_record.title_ar ILIKE '%دروس%' OR case_record.title_ar ILIKE '%تعليم%' OR 
              case_record.title_ar ILIKE '%مصاريف مدرس%' OR case_record.title_ar ILIKE '%لاب توب%' OR
              case_record.title_ar ILIKE '%هندسه%' OR case_record.title_ar ILIKE '%ثانويه%' OR 
              case_record.title_ar ILIKE '%طلبه%' OR case_record.title_ar ILIKE '%أزهر%' OR 
              case_record.title_ar ILIKE '%شباب الأزهر%' THEN
            new_category_id := canonical_education;
        
        -- Housing & Rent
        ELSIF case_record.title_ar ILIKE '%ايجار%' OR case_record.title_ar ILIKE '%إيجار%' OR 
              case_record.title_ar ILIKE '%بيت%' OR case_record.title_ar ILIKE '%شقه%' OR 
              case_record.title_ar ILIKE '%سقف%' OR case_record.title_ar ILIKE '%ارضيه%' OR
              case_record.title_ar ILIKE '%مرتبه%' OR case_record.title_ar ILIKE '%كهربا%' OR 
              case_record.title_ar ILIKE '%كهرباء%' OR case_record.title_ar ILIKE '%سباكه%' OR 
              case_record.title_ar ILIKE '%حمام%' OR case_record.title_ar ILIKE '%تصليح%' THEN
            new_category_id := canonical_housing;
        
        -- Home Appliances
        ELSIF case_record.title_ar ILIKE '%تلاجه%' OR case_record.title_ar ILIKE '%غساله%' OR 
              case_record.title_ar ILIKE '%بوتاجاز%' OR case_record.title_ar ILIKE '%مروحه%' OR 
              case_record.title_ar ILIKE '%فريزر%' OR case_record.title_ar ILIKE '%كولدير%' OR
              case_record.title_ar ILIKE '%دولاب%' OR case_record.title_ar ILIKE '%شاشه%' OR 
              case_record.title_ar ILIKE '%سرير%' OR case_record.title_ar ILIKE '%جهاز%' OR 
              case_record.title_ar ILIKE '%أنبوبه%' OR case_record.title_ar ILIKE '%ماكينه%' OR
              case_record.title_ar ILIKE '%خياطه%' OR case_record.title_ar ILIKE '%اوفر%' OR 
              case_record.title_ar ILIKE '%موبايل%' THEN
            new_category_id := canonical_appliances;
        
        -- Emergency Relief
        ELSIF case_record.title_ar ILIKE '%دين%' OR case_record.title_ar ILIKE '%دين حالا%' OR 
              case_record.title_ar ILIKE '%غارمه%' OR case_record.title_ar ILIKE '%مطلقه%' OR 
              case_record.title_ar ILIKE '%أرمله%' OR case_record.title_ar ILIKE '%أيتام%' OR
              case_record.title_ar ILIKE '%يتيم%' OR case_record.title_ar ILIKE '%بتيم%' OR 
              case_record.title_ar ILIKE '%المتوفي%' OR case_record.title_ar ILIKE '%اكفان%' THEN
            new_category_id := canonical_emergency;
        
        -- Livelihood & Business Support
        ELSIF case_record.title_ar ILIKE '%مشروع%' OR case_record.title_ar ILIKE '%عربيه%' OR 
              case_record.title_ar ILIKE '%مقدم%' OR case_record.title_ar ILIKE '%موتوسيكل%' OR 
              case_record.title_ar ILIKE '%طيور%' OR case_record.title_ar ILIKE '%زراعه%' THEN
            new_category_id := canonical_livelihood;
        
        -- Social & Community Support
        ELSIF case_record.title_ar ILIKE '%جواز%' OR case_record.title_ar ILIKE '%حلويات%' OR 
              case_record.title_ar ILIKE '%مولد%' OR case_record.title_ar ILIKE '%مسجد%' OR 
              case_record.title_ar ILIKE '%منبر%' OR case_record.title_ar ILIKE '%سجاجيد%' OR
              case_record.title_ar ILIKE '%بنا%' OR case_record.title_ar ILIKE '%تجديد%' OR 
              case_record.title_ar ILIKE '%افتتاح%' THEN
            new_category_id := canonical_community;
        
        -- Basic Needs & Clothing
        ELSIF case_record.title_ar ILIKE '%بطاطين%' OR case_record.title_ar ILIKE '%جواكت%' OR 
              case_record.title_ar ILIKE '%لعب%' OR case_record.title_ar ILIKE '%ميكب%' OR 
              case_record.title_ar ILIKE '%فساتين%' OR case_record.title_ar ILIKE '%لبس%' OR
              case_record.title_ar ILIKE '%شتوي%' OR case_record.title_ar ILIKE '%نيجيري%' THEN
            new_category_id := canonical_basicneeds;
        
        -- Default to Other Support
        ELSE
            new_category_id := canonical_other;
        END IF;
        
        -- Update case if category changed
        IF new_category_id IS NOT NULL AND case_record.category_id != new_category_id THEN
            UPDATE cases 
            SET category_id = new_category_id 
            WHERE id = case_record.id;
            cases_updated := cases_updated + 1;
        ELSE
            cases_skipped := cases_skipped + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Recategorization complete!';
    RAISE NOTICE 'Cases updated: %', cases_updated;
    RAISE NOTICE 'Cases skipped (already correct): %', cases_skipped;
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION: Show cases by category
-- ================================================================
SELECT 
    cc.name_en as category_name,
    COUNT(c.id) as case_count
FROM case_categories cc
LEFT JOIN cases c ON c.category_id = cc.id
GROUP BY cc.id, cc.name_en
ORDER BY case_count DESC, cc.name_en;

