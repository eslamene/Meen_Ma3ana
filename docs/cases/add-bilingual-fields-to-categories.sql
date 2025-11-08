-- ================================================================
-- ADD BILINGUAL FIELDS TO case_categories TABLE
-- ================================================================
-- This migration adds name_en, name_ar, description_en, description_ar
-- columns to the case_categories table and migrates existing data.
-- ================================================================

BEGIN;

DO $$
BEGIN
    -- Add name_en column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_categories' 
        AND column_name = 'name_en'
    ) THEN
        ALTER TABLE case_categories ADD COLUMN name_en TEXT;
        RAISE NOTICE 'Added name_en column';
    END IF;
    
    -- Add name_ar column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_categories' 
        AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE case_categories ADD COLUMN name_ar TEXT;
        RAISE NOTICE 'Added name_ar column';
    END IF;
    
    -- Add description_en column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_categories' 
        AND column_name = 'description_en'
    ) THEN
        ALTER TABLE case_categories ADD COLUMN description_en TEXT;
        RAISE NOTICE 'Added description_en column';
    END IF;
    
    -- Add description_ar column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_categories' 
        AND column_name = 'description_ar'
    ) THEN
        ALTER TABLE case_categories ADD COLUMN description_ar TEXT;
        RAISE NOTICE 'Added description_ar column';
    END IF;
    
    -- Migrate existing data: name -> name_en, description -> description_en
    -- Set name_ar and description_ar based on category name
    UPDATE case_categories
    SET 
        name_en = COALESCE(name_en, name),
        description_en = COALESCE(description_en, description),
        name_ar = CASE name
            WHEN 'Medical Support' THEN 'الدعم الطبي'
            WHEN 'Educational Assistance' THEN 'المساعدة التعليمية'
            WHEN 'Housing & Rent' THEN 'السكن والإيجار'
            WHEN 'Home Appliances' THEN 'الأجهزة المنزلية'
            WHEN 'Emergency Relief' THEN 'الإغاثة الطارئة'
            WHEN 'Livelihood & Business' THEN 'الدعم المعيشي والتجاري'
            WHEN 'Community & Social' THEN 'الدعم المجتمعي والاجتماعي'
            WHEN 'Basic Needs & Clothing' THEN 'الاحتياجات الأساسية والملابس'
            WHEN 'Other Support' THEN 'دعم آخر'
            WHEN 'Medical' THEN 'الدعم الطبي'
            WHEN 'Education' THEN 'المساعدة التعليمية'
            WHEN 'Housing' THEN 'السكن والإيجار'
            WHEN 'Emergency' THEN 'الإغاثة الطارئة'
            WHEN 'Other' THEN 'دعم آخر'
            WHEN 'Food' THEN 'الاحتياجات الأساسية والملابس'
            ELSE COALESCE(name_ar, name)
        END,
        description_ar = CASE name
            WHEN 'Medical Support' THEN 'النفقات الطبية الطارئة والعلاجات والأدوية والرعاية المستمرة'
            WHEN 'Educational Assistance' THEN 'الرسوم الدراسية والمستلزمات والدروس الخصوصية والدعم التعليمي'
            WHEN 'Housing & Rent' THEN 'مساعدة الإيجار وإصلاحات السكن وفواتير الخدمات'
            WHEN 'Home Appliances' THEN 'الثلاجات والغسالات والمواقد والأجهزة المنزلية الأساسية'
            WHEN 'Emergency Relief' THEN 'الدعم الطارئ للأرامل والأيتام والأسر في الأزمات'
            WHEN 'Livelihood & Business' THEN 'الدعم المعيشي والتجاري'
            WHEN 'Community & Social' THEN 'الدعم المجتمعي والاجتماعي'
            WHEN 'Basic Needs & Clothing' THEN 'الاحتياجات الأساسية والملابس'
            WHEN 'Other Support' THEN 'دعم آخر'
            WHEN 'Medical' THEN 'النفقات الطبية الطارئة والعلاجات والأدوية والرعاية المستمرة'
            WHEN 'Education' THEN 'الرسوم الدراسية والمستلزمات والدروس الخصوصية والدعم التعليمي'
            WHEN 'Housing' THEN 'مساعدة الإيجار وإصلاحات السكن وفواتير الخدمات'
            WHEN 'Emergency' THEN 'الدعم الطارئ للأرامل والأيتام والأسر في الأزمات'
            WHEN 'Other' THEN 'دعم آخر'
            WHEN 'Food' THEN 'الاحتياجات الأساسية والملابس'
            ELSE COALESCE(description_ar, description)
        END
    WHERE name_en IS NULL OR name_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;
    
    RAISE NOTICE 'Migrated existing data to bilingual fields';
    
    -- Make name_en NOT NULL (after migration)
    -- First, ensure all rows have name_en
    UPDATE case_categories SET name_en = name WHERE name_en IS NULL;
    
    -- Now make it NOT NULL
    ALTER TABLE case_categories ALTER COLUMN name_en SET NOT NULL;
    RAISE NOTICE 'Set name_en as NOT NULL';
    
    -- Make name_ar NOT NULL (after migration)
    UPDATE case_categories SET name_ar = name_en WHERE name_ar IS NULL;
    ALTER TABLE case_categories ALTER COLUMN name_ar SET NOT NULL;
    RAISE NOTICE 'Set name_ar as NOT NULL';
    
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION: Show migrated categories
-- ================================================================
SELECT 
    id,
    name,
    name_en,
    name_ar,
    description_en,
    description_ar,
    is_active
FROM case_categories
ORDER BY name_en;

