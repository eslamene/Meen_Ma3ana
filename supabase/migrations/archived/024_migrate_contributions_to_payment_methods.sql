-- Migrate existing contributions to use payment_methods lookup table
-- This migration maps existing payment_method text values to payment_methods table UUIDs

-- Step 1: Ensure payment_methods table has all the default methods
-- (This should already be done by migration 022, but we ensure it here for safety)
INSERT INTO payment_methods (code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active)
VALUES
  ('bank_transfer', 'Bank Transfer', 'Bank Transfer', 'تحويل بنكي', 'Direct bank transfer to our account', 'Direct bank transfer to our account', 'تحويل مباشر إلى حسابنا البنكي', 'Building2', 1, true),
  ('mobile_wallet', 'Mobile Wallet', 'Mobile Wallet', 'محفظة رقمية', 'Mobile payment through various wallet services', 'Mobile payment through various wallet services', 'دفع عبر المحافظ الرقمية', 'Smartphone', 2, true),
  ('cash', 'Cash', 'Cash', 'نقدي', 'Cash payment at our office or through representatives', 'Cash payment at our office or through representatives', 'دفع نقدي في مكتبنا أو من خلال ممثلينا', 'Banknote', 3, true),
  ('check', 'Check', 'Check', 'شيك', 'Payment by check or bank draft', 'Payment by check or bank draft', 'الدفع بشيك أو كمبيالة بنكية', 'FileCheck', 4, true),
  ('ipn', 'IPN', 'IPN', 'إشعار الدفع الفوري', 'Instant Payment Notification', 'Instant Payment Notification', 'إشعار الدفع الفوري', 'CreditCard', 5, true)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Check if contributions table has payment_method (text) column
-- If it exists, we need to migrate it to payment_method_id (uuid)
DO $$
DECLARE
    has_payment_method_text BOOLEAN;
    has_payment_method_id_uuid BOOLEAN;
BEGIN
    -- Check if payment_method (text) column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contributions' 
        AND column_name = 'payment_method' 
        AND data_type = 'text'
    ) INTO has_payment_method_text;
    
    -- Check if payment_method_id (uuid) column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contributions' 
        AND column_name = 'payment_method_id' 
        AND data_type = 'uuid'
    ) INTO has_payment_method_id_uuid;

    -- If we have payment_method (text) but not payment_method_id (uuid), we need to add the column first
    IF has_payment_method_text AND NOT has_payment_method_id_uuid THEN
        -- Add payment_method_id column
        ALTER TABLE contributions ADD COLUMN payment_method_id uuid;
        
        -- Migrate data: Map text values to UUIDs
        UPDATE contributions c
        SET payment_method_id = pm.id
        FROM payment_methods pm
        WHERE LOWER(TRIM(c.payment_method)) = LOWER(pm.code)
           OR LOWER(TRIM(c.payment_method)) = LOWER(REPLACE(pm.code, '_', ' '))
           OR LOWER(TRIM(c.payment_method)) = LOWER(pm.name)
           OR LOWER(TRIM(c.payment_method)) = LOWER(pm.name_en);
        
        -- Handle common variations and mappings
        -- Map common text variations to codes
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'bank_transfer' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%bank%' 
            OR LOWER(c.payment_method) LIKE '%transfer%'
            OR LOWER(c.payment_method) LIKE '%wire%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'mobile_wallet' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%mobile%' 
            OR LOWER(c.payment_method) LIKE '%wallet%'
            OR LOWER(c.payment_method) LIKE '%momo%'
            OR LOWER(c.payment_method) LIKE '%vodafone%'
            OR LOWER(c.payment_method) LIKE '%orange%'
            OR LOWER(c.payment_method) LIKE '%etisalat%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'cash' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%cash%'
            OR LOWER(c.payment_method) LIKE '%نقد%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'check' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%check%'
            OR LOWER(c.payment_method) LIKE '%cheque%'
            OR LOWER(c.payment_method) LIKE '%شيك%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'ipn' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%ipn%'
            OR LOWER(c.payment_method) LIKE '%instant%'
            OR LOWER(c.payment_method) LIKE '%online%'
            OR LOWER(c.payment_method) LIKE '%card%'
          );
        
        -- For any remaining unmapped values, default to 'cash' as a safe fallback
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'cash' LIMIT 1)
        WHERE payment_method_id IS NULL;
        
        -- Make payment_method_id NOT NULL after migration
        ALTER TABLE contributions ALTER COLUMN payment_method_id SET NOT NULL;
        
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contributions_payment_method_id_payment_methods_id_fk'
        ) THEN
            ALTER TABLE contributions 
            ADD CONSTRAINT contributions_payment_method_id_payment_methods_id_fk 
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
        
        -- Drop the old payment_method column
        ALTER TABLE contributions DROP COLUMN IF EXISTS payment_method;
        
    ELSIF has_payment_method_text AND has_payment_method_id_uuid THEN
        -- Both columns exist - migrate data from text to uuid
        UPDATE contributions c
        SET payment_method_id = pm.id
        FROM payment_methods pm
        WHERE c.payment_method_id IS NULL
          AND (
            LOWER(TRIM(c.payment_method)) = LOWER(pm.code)
            OR LOWER(TRIM(c.payment_method)) = LOWER(REPLACE(pm.code, '_', ' '))
            OR LOWER(TRIM(c.payment_method)) = LOWER(pm.name)
            OR LOWER(TRIM(c.payment_method)) = LOWER(pm.name_en)
          );
        
        -- Handle variations (same as above)
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'bank_transfer' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%bank%' 
            OR LOWER(c.payment_method) LIKE '%transfer%'
            OR LOWER(c.payment_method) LIKE '%wire%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'mobile_wallet' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%mobile%' 
            OR LOWER(c.payment_method) LIKE '%wallet%'
            OR LOWER(c.payment_method) LIKE '%momo%'
            OR LOWER(c.payment_method) LIKE '%vodafone%'
            OR LOWER(c.payment_method) LIKE '%orange%'
            OR LOWER(c.payment_method) LIKE '%etisalat%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'cash' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%cash%'
            OR LOWER(c.payment_method) LIKE '%نقد%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'check' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%check%'
            OR LOWER(c.payment_method) LIKE '%cheque%'
            OR LOWER(c.payment_method) LIKE '%شيك%'
          );
        
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'ipn' LIMIT 1)
        WHERE payment_method_id IS NULL 
          AND (
            LOWER(c.payment_method) LIKE '%ipn%'
            OR LOWER(c.payment_method) LIKE '%instant%'
            OR LOWER(c.payment_method) LIKE '%online%'
            OR LOWER(c.payment_method) LIKE '%card%'
          );
        
        -- Default fallback
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'cash' LIMIT 1)
        WHERE payment_method_id IS NULL;
        
        -- Drop the old payment_method column
        ALTER TABLE contributions DROP COLUMN IF EXISTS payment_method;
        
    ELSIF NOT has_payment_method_text AND has_payment_method_id_uuid THEN
        -- Already migrated - just ensure all contributions have valid payment_method_id
        -- Update any NULL payment_method_id to default 'cash'
        UPDATE contributions c
        SET payment_method_id = (SELECT id FROM payment_methods WHERE code = 'cash' LIMIT 1)
        WHERE payment_method_id IS NULL;
        
        -- Ensure foreign key constraint exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contributions_payment_method_id_payment_methods_id_fk'
        ) THEN
            ALTER TABLE contributions 
            ADD CONSTRAINT contributions_payment_method_id_payment_methods_id_fk 
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
    END IF;
END $$;

-- Step 3: Create a temporary backup column to store original payment_method values (for reference)
-- This allows us to verify the migration was correct
DO $$
BEGIN
    -- Add a backup column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contributions' 
        AND column_name = 'payment_method_backup'
    ) THEN
        ALTER TABLE contributions ADD COLUMN payment_method_backup text;
        
        -- Copy any remaining payment_method values to backup (only if column exists)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contributions' 
            AND column_name = 'payment_method'
        ) THEN
            UPDATE contributions 
            SET payment_method_backup = payment_method 
            WHERE payment_method IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Step 4: Verification query (commented out - uncomment to run manually)
-- SELECT 
--     pm.code,
--     pm.name_en,
--     COUNT(c.id) as contribution_count,
--     COUNT(CASE WHEN c.payment_method_backup IS NOT NULL THEN 1 END) as migrated_count
-- FROM payment_methods pm
-- LEFT JOIN contributions c ON c.payment_method_id = pm.id
-- GROUP BY pm.id, pm.code, pm.name_en
-- ORDER BY contribution_count DESC;

