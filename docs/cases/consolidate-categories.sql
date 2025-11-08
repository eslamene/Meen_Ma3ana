-- ================================================================
-- CONSOLIDATE CASE CATEGORIES (WITH BILINGUAL SUPPORT)
-- ================================================================
-- This script consolidates duplicate case categories and updates
-- all cases to use the canonical category IDs.
-- Supports both old schema (name, description) and new schema
-- (name_en, name_ar, description_en, description_ar)
--
-- Standard Categories (from generate-cases-from-csv.js):
-- 1. Medical Support
-- 2. Educational Assistance
-- 3. Housing & Rent
-- 4. Home Appliances
-- 5. Emergency Relief
-- 6. Livelihood & Business
-- 7. Community & Social
-- 8. Basic Needs & Clothing
-- 9. Other Support
-- ================================================================

BEGIN;

DO $$
DECLARE
    -- Canonical category IDs (will be set)
    canonical_medical UUID;
    canonical_education UUID;
    canonical_housing UUID;
    canonical_appliances UUID;
    canonical_emergency UUID;
    canonical_livelihood UUID;
    canonical_community UUID;
    canonical_basicneeds UUID;
    canonical_other UUID;
    
    -- Old category IDs to migrate from
    old_category_id UUID;
    cases_updated INTEGER;
BEGIN
    -- ================================================================
    -- STEP 1: Select canonical categories (use name_en if available, fallback to name)
    -- ================================================================
    
    -- Medical Support
    SELECT id INTO canonical_medical
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Medical Support'
    ORDER BY 
        CASE WHEN COALESCE(description_en, description) LIKE '%Emergency medical expenses%' THEN 1 ELSE 2 END,
        created_at ASC
    LIMIT 1;
    
    -- If no Medical Support exists, try "Medical"
    IF canonical_medical IS NULL THEN
        SELECT id INTO canonical_medical
        FROM case_categories
        WHERE COALESCE(name_en, name) = 'Medical'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Educational Assistance
    SELECT id INTO canonical_education
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Educational Assistance'
    ORDER BY 
        CASE WHEN COALESCE(description_en, description) LIKE '%School fees%' THEN 1 ELSE 2 END,
        created_at ASC
    LIMIT 1;
    
    -- If no Educational Assistance exists, try "Education"
    IF canonical_education IS NULL THEN
        SELECT id INTO canonical_education
        FROM case_categories
        WHERE COALESCE(name_en, name) = 'Education'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Housing & Rent
    SELECT id INTO canonical_housing
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Housing & Rent'
    ORDER BY 
        CASE WHEN COALESCE(description_en, description) LIKE '%Rent assistance%' THEN 1 ELSE 2 END,
        created_at ASC
    LIMIT 1;
    
    -- If no Housing & Rent exists, try "Housing"
    IF canonical_housing IS NULL THEN
        SELECT id INTO canonical_housing
        FROM case_categories
        WHERE COALESCE(name_en, name) = 'Housing'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Home Appliances
    SELECT id INTO canonical_appliances
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Home Appliances'
    ORDER BY 
        CASE WHEN COALESCE(description_en, description) LIKE '%Refrigerators%' THEN 1 ELSE 2 END,
        created_at ASC
    LIMIT 1;
    
    -- Emergency Relief
    SELECT id INTO canonical_emergency
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Emergency Relief'
    ORDER BY 
        CASE WHEN COALESCE(description_en, description) LIKE '%Emergency support%' THEN 1 ELSE 2 END,
        created_at ASC
    LIMIT 1;
    
    -- If no Emergency Relief exists, try "Emergency"
    IF canonical_emergency IS NULL THEN
        SELECT id INTO canonical_emergency
        FROM case_categories
        WHERE COALESCE(name_en, name) = 'Emergency'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- Livelihood & Business
    SELECT id INTO canonical_livelihood
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Livelihood & Business'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Community & Social
    SELECT id INTO canonical_community
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Community & Social'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Basic Needs & Clothing
    SELECT id INTO canonical_basicneeds
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Basic Needs & Clothing'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Other Support
    SELECT id INTO canonical_other
    FROM case_categories
    WHERE COALESCE(name_en, name) = 'Other Support'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If no Other Support exists, try "Other"
    IF canonical_other IS NULL THEN
        SELECT id INTO canonical_other
        FROM case_categories
        WHERE COALESCE(name_en, name) = 'Other'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    -- ================================================================
    -- STEP 2: Create missing canonical categories with bilingual fields
    -- ================================================================
    
    IF canonical_medical IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar, 
            description, description_en, description_ar, 
            is_active
        ) VALUES (
            'Medical Support', 
            'Medical Support', 
            'الدعم الطبي',
            'Emergency medical expenses, treatments, medications, and ongoing care',
            'Emergency medical expenses, treatments, medications, and ongoing care',
            'النفقات الطبية الطارئة والعلاجات والأدوية والرعاية المستمرة',
            true
        ) RETURNING id INTO canonical_medical;
        RAISE NOTICE 'Created canonical category: Medical Support';
    END IF;
    
    IF canonical_education IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Educational Assistance',
            'Educational Assistance',
            'المساعدة التعليمية',
            'School fees, supplies, tutoring, and educational support',
            'School fees, supplies, tutoring, and educational support',
            'الرسوم الدراسية والمستلزمات والدروس الخصوصية والدعم التعليمي',
            true
        ) RETURNING id INTO canonical_education;
        RAISE NOTICE 'Created canonical category: Educational Assistance';
    END IF;
    
    IF canonical_housing IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Housing & Rent',
            'Housing & Rent',
            'السكن والإيجار',
            'Rent assistance, housing repairs, and utility bills',
            'Rent assistance, housing repairs, and utility bills',
            'مساعدة الإيجار وإصلاحات السكن وفواتير الخدمات',
            true
        ) RETURNING id INTO canonical_housing;
        RAISE NOTICE 'Created canonical category: Housing & Rent';
    END IF;
    
    IF canonical_appliances IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Home Appliances',
            'Home Appliances',
            'الأجهزة المنزلية',
            'Refrigerators, washing machines, stoves, and essential home appliances',
            'Refrigerators, washing machines, stoves, and essential home appliances',
            'الثلاجات والغسالات والمواقد والأجهزة المنزلية الأساسية',
            true
        ) RETURNING id INTO canonical_appliances;
        RAISE NOTICE 'Created canonical category: Home Appliances';
    END IF;
    
    IF canonical_emergency IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Emergency Relief',
            'Emergency Relief',
            'الإغاثة الطارئة',
            'Emergency support for widows, orphans, and families in crisis',
            'Emergency support for widows, orphans, and families in crisis',
            'الدعم الطارئ للأرامل والأيتام والأسر في الأزمات',
            true
        ) RETURNING id INTO canonical_emergency;
        RAISE NOTICE 'Created canonical category: Emergency Relief';
    END IF;
    
    IF canonical_livelihood IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Livelihood & Business',
            'Livelihood & Business',
            'الدعم المعيشي والتجاري',
            'Livelihood & Business category',
            'Livelihood & Business category',
            'الدعم المعيشي والتجاري',
            true
        ) RETURNING id INTO canonical_livelihood;
        RAISE NOTICE 'Created canonical category: Livelihood & Business';
    END IF;
    
    IF canonical_community IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Community & Social',
            'Community & Social',
            'الدعم المجتمعي والاجتماعي',
            'Community & Social category',
            'Community & Social category',
            'الدعم المجتمعي والاجتماعي',
            true
        ) RETURNING id INTO canonical_community;
        RAISE NOTICE 'Created canonical category: Community & Social';
    END IF;
    
    IF canonical_basicneeds IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Basic Needs & Clothing',
            'Basic Needs & Clothing',
            'الاحتياجات الأساسية والملابس',
            'Basic Needs & Clothing category',
            'Basic Needs & Clothing category',
            'الاحتياجات الأساسية والملابس',
            true
        ) RETURNING id INTO canonical_basicneeds;
        RAISE NOTICE 'Created canonical category: Basic Needs & Clothing';
    END IF;
    
    IF canonical_other IS NULL THEN
        INSERT INTO case_categories (
            name, name_en, name_ar,
            description, description_en, description_ar,
            is_active
        ) VALUES (
            'Other Support',
            'Other Support',
            'دعم آخر',
            'Other Support category',
            'Other Support category',
            'دعم آخر',
            true
        ) RETURNING id INTO canonical_other;
        RAISE NOTICE 'Created canonical category: Other Support';
    END IF;
    
    -- ================================================================
    -- STEP 3: Update cases to use canonical categories
    -- ================================================================
    
    -- Update Medical Support cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) IN ('Medical Support', 'Medical') 
        AND id != canonical_medical
    LOOP
        UPDATE cases 
        SET category_id = canonical_medical 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Medical category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_medical;
    END LOOP;
    
    -- Update Educational Assistance cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) IN ('Educational Assistance', 'Education') 
        AND id != canonical_education
    LOOP
        UPDATE cases 
        SET category_id = canonical_education 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Education category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_education;
    END LOOP;
    
    -- Update Housing & Rent cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) IN ('Housing & Rent', 'Housing') 
        AND id != canonical_housing
    LOOP
        UPDATE cases 
        SET category_id = canonical_housing 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Housing category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_housing;
    END LOOP;
    
    -- Update Home Appliances cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) = 'Home Appliances' 
        AND id != canonical_appliances
    LOOP
        UPDATE cases 
        SET category_id = canonical_appliances 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Home Appliances category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_appliances;
    END LOOP;
    
    -- Update Emergency Relief cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) IN ('Emergency Relief', 'Emergency') 
        AND id != canonical_emergency
    LOOP
        UPDATE cases 
        SET category_id = canonical_emergency 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Emergency category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_emergency;
    END LOOP;
    
    -- Update Livelihood & Business cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) = 'Livelihood & Business' 
        AND id != canonical_livelihood
    LOOP
        UPDATE cases 
        SET category_id = canonical_livelihood 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Livelihood category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_livelihood;
    END LOOP;
    
    -- Update Community & Social cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) = 'Community & Social' 
        AND id != canonical_community
    LOOP
        UPDATE cases 
        SET category_id = canonical_community 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Community category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_community;
    END LOOP;
    
    -- Update Basic Needs & Clothing cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) = 'Basic Needs & Clothing' 
        AND id != canonical_basicneeds
    LOOP
        UPDATE cases 
        SET category_id = canonical_basicneeds 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Basic Needs category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_basicneeds;
    END LOOP;
    
    -- Update Other Support cases
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) IN ('Other Support', 'Other') 
        AND id != canonical_other
    LOOP
        UPDATE cases 
        SET category_id = canonical_other 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from old Other category (%) to canonical (%)', 
            cases_updated, old_category_id, canonical_other;
    END LOOP;
    
    -- Handle "Food" category - map to Basic Needs & Clothing
    FOR old_category_id IN 
        SELECT DISTINCT id FROM case_categories 
        WHERE COALESCE(name_en, name) = 'Food'
    LOOP
        UPDATE cases 
        SET category_id = canonical_basicneeds 
        WHERE category_id = old_category_id;
        GET DIAGNOSTICS cases_updated = ROW_COUNT;
        RAISE NOTICE 'Updated % cases from Food category (%) to Basic Needs & Clothing (%)', 
            cases_updated, old_category_id, canonical_basicneeds;
    END LOOP;
    
    -- ================================================================
    -- STEP 4: Delete duplicate categories (only if no cases reference them)
    -- ================================================================
    
    -- Delete duplicate Medical Support categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) IN ('Medical Support', 'Medical') 
    AND id != canonical_medical
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Educational Assistance categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) IN ('Educational Assistance', 'Education') 
    AND id != canonical_education
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Housing & Rent categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) IN ('Housing & Rent', 'Housing') 
    AND id != canonical_housing
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Home Appliances categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) = 'Home Appliances' 
    AND id != canonical_appliances
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Emergency Relief categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) IN ('Emergency Relief', 'Emergency') 
    AND id != canonical_emergency
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Livelihood & Business categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) = 'Livelihood & Business' 
    AND id != canonical_livelihood
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Community & Social categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) = 'Community & Social' 
    AND id != canonical_community
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Basic Needs & Clothing categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) = 'Basic Needs & Clothing' 
    AND id != canonical_basicneeds
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete duplicate Other Support categories
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) IN ('Other Support', 'Other') 
    AND id != canonical_other
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    -- Delete Food category (mapped to Basic Needs)
    DELETE FROM case_categories 
    WHERE COALESCE(name_en, name) = 'Food'
    AND NOT EXISTS (SELECT 1 FROM cases WHERE category_id = case_categories.id);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Category consolidation complete!';
    RAISE NOTICE 'Canonical categories:';
    RAISE NOTICE '  Medical Support: %', canonical_medical;
    RAISE NOTICE '  Educational Assistance: %', canonical_education;
    RAISE NOTICE '  Housing & Rent: %', canonical_housing;
    RAISE NOTICE '  Home Appliances: %', canonical_appliances;
    RAISE NOTICE '  Emergency Relief: %', canonical_emergency;
    RAISE NOTICE '  Livelihood & Business: %', canonical_livelihood;
    RAISE NOTICE '  Community & Social: %', canonical_community;
    RAISE NOTICE '  Basic Needs & Clothing: %', canonical_basicneeds;
    RAISE NOTICE '  Other Support: %', canonical_other;
    RAISE NOTICE '========================================';
    
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION: Show final category count and list
-- ================================================================
SELECT 
    COALESCE(name_en, name) as category_name,
    COUNT(*) as case_count,
    STRING_AGG(DISTINCT id::text, ', ') as category_ids
FROM case_categories
GROUP BY COALESCE(name_en, name)
ORDER BY category_name;

SELECT 
    COUNT(*) as total_categories,
    COUNT(DISTINCT COALESCE(name_en, name)) as unique_category_names
FROM case_categories;
