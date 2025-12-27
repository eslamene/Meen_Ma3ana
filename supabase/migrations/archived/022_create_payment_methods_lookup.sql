-- Create payment_methods lookup table and enable RLS
-- This migration creates/updates the payment_methods table, inserts default data, and sets up RLS policies

-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Add bilingual fields if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'name_en') THEN
    ALTER TABLE payment_methods ADD COLUMN name_en text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'name_ar') THEN
    ALTER TABLE payment_methods ADD COLUMN name_ar text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'description_en') THEN
    ALTER TABLE payment_methods ADD COLUMN description_en text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'description_ar') THEN
    ALTER TABLE payment_methods ADD COLUMN description_ar text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'icon') THEN
    ALTER TABLE payment_methods ADD COLUMN icon text;
  END IF;
END $$;

-- Insert default payment methods if they don't exist
INSERT INTO payment_methods (code, name, name_en, name_ar, description, description_en, description_ar, icon, sort_order, is_active)
VALUES
  ('bank_transfer', 'Bank Transfer', 'Bank Transfer', 'تحويل بنكي', 'Direct bank transfer to our account', 'Direct bank transfer to our account', 'تحويل مباشر إلى حسابنا البنكي', 'Building2', 1, true),
  ('mobile_wallet', 'Mobile Wallet', 'Mobile Wallet', 'محفظة رقمية', 'Mobile payment through various wallet services', 'Mobile payment through various wallet services', 'دفع عبر المحافظ الرقمية', 'Smartphone', 2, true),
  ('cash', 'Cash', 'Cash', 'نقدي', 'Cash payment at our office or through representatives', 'Cash payment at our office or through representatives', 'دفع نقدي في مكتبنا أو من خلال ممثلينا', 'Banknote', 3, true),
  ('check', 'Check', 'Check', 'شيك', 'Payment by check or bank draft', 'Payment by check or bank draft', 'الدفع بشيك أو كمبيالة بنكية', 'FileCheck', 4, true),
  ('ipn', 'IPN', 'IPN', 'إشعار الدفع الفوري', 'Instant Payment Notification', 'Instant Payment Notification', 'إشعار الدفع الفوري', 'CreditCard', 5, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can view all payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can insert payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can update payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can delete payment methods" ON payment_methods;

-- Policy: Everyone can view active payment methods (for public display in forms, etc.)
CREATE POLICY "Anyone can view active payment methods"
ON payment_methods
FOR SELECT
USING (is_active = true);

-- Policy: Admins can view all payment methods (including inactive ones)
CREATE POLICY "Admins can view all payment methods"
ON payment_methods
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can insert payment methods
CREATE POLICY "Admins can insert payment methods"
ON payment_methods
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can update payment methods
CREATE POLICY "Admins can update payment methods"
ON payment_methods
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can delete payment methods
CREATE POLICY "Admins can delete payment methods"
ON payment_methods
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_user_roles ur
    JOIN admin_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('admin', 'super_admin')
  )
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);

