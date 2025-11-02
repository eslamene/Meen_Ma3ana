-- Enhance beneficiaries table with document attachments and lookup fields

-- Add document attachments table
CREATE TABLE IF NOT EXISTS beneficiary_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'identity_copy', 'personal_photo', 'other'
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_public BOOLEAN DEFAULT false, -- true = visible to all, false = only contributors
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_beneficiary_documents_beneficiary_id ON beneficiary_documents(beneficiary_id);
CREATE INDEX idx_beneficiary_documents_type ON beneficiary_documents(document_type);
CREATE INDEX idx_beneficiary_documents_public ON beneficiary_documents(is_public);

-- Add additional mobile number to beneficiaries
ALTER TABLE beneficiaries 
ADD COLUMN additional_mobile_number VARCHAR(20);

-- Create ID types lookup table
CREATE TABLE IF NOT EXISTS id_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cities lookup table
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  governorate VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Egypt',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default ID types
INSERT INTO id_types (code, name_en, name_ar, description, sort_order) VALUES
('national_id', 'National ID', 'رقم قومي', 'Egyptian National ID', 1),
('passport', 'Passport', 'جواز سفر', 'International Passport', 2),
('birth_certificate', 'Birth Certificate', 'شهادة ميلاد', 'Birth Certificate', 3),
('military_id', 'Military ID', 'رقم عسكري', 'Military Service ID', 4),
('other', 'Other', 'أخرى', 'Other identification document', 5);

-- Insert major Egyptian cities
INSERT INTO cities (code, name_en, name_ar, governorate, sort_order) VALUES
('cairo', 'Cairo', 'القاهرة', 'Cairo', 1),
('giza', 'Giza', 'الجيزة', 'Giza', 2),
('alexandria', 'Alexandria', 'الإسكندرية', 'Alexandria', 3),
('shubra_el_kheima', 'Shubra El Kheima', 'شبرا الخيمة', 'Qalyubia', 4),
('port_said', 'Port Said', 'بورسعيد', 'Port Said', 5),
('suez', 'Suez', 'السويس', 'Suez', 6),
('luxor', 'Luxor', 'الأقصر', 'Luxor', 7),
('mansoura', 'Mansoura', 'المنصورة', 'Dakahlia', 8),
('el_mahalla_el_kubra', 'El Mahalla El Kubra', 'المحلة الكبرى', 'Gharbia', 9),
('tanta', 'Tanta', 'طنطا', 'Gharbia', 10),
('asyut', 'Asyut', 'أسيوط', 'Asyut', 11),
('ismailia', 'Ismailia', 'الإسماعيلية', 'Ismailia', 12),
('faiyum', 'Faiyum', 'الفيوم', 'Faiyum', 13),
('zagazig', 'Zagazig', 'الزقازيق', 'Sharqia', 14),
('aswan', 'Aswan', 'أسوان', 'Aswan', 15),
('damietta', 'Damietta', 'دمياط', 'Damietta', 16),
('minya', 'Minya', 'المنيا', 'Minya', 17),
('beni_suef', 'Beni Suef', 'بني سويف', 'Beni Suef', 18),
('qena', 'Qena', 'قنا', 'Qena', 19),
('sohag', 'Sohag', 'سوهاج', 'Sohag', 20);

-- Update beneficiaries table to reference lookup tables
ALTER TABLE beneficiaries 
ADD COLUMN id_type_id UUID REFERENCES id_types(id),
ADD COLUMN city_id UUID REFERENCES cities(id);

-- Add RLS policies for beneficiary_documents
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public documents or documents for beneficiaries they have access to
CREATE POLICY "Users can view beneficiary documents" ON beneficiary_documents
  FOR SELECT USING (
    is_public = true OR 
    beneficiary_id IN (
      SELECT id FROM beneficiaries WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can insert documents for beneficiaries they created
CREATE POLICY "Users can insert beneficiary documents" ON beneficiary_documents
  FOR INSERT WITH CHECK (
    beneficiary_id IN (
      SELECT id FROM beneficiaries WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can update documents for beneficiaries they created
CREATE POLICY "Users can update beneficiary documents" ON beneficiary_documents
  FOR UPDATE USING (
    beneficiary_id IN (
      SELECT id FROM beneficiaries WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can delete documents for beneficiaries they created
CREATE POLICY "Users can delete beneficiary documents" ON beneficiary_documents
  FOR DELETE USING (
    beneficiary_id IN (
      SELECT id FROM beneficiaries WHERE created_by = auth.uid()
    )
  );

-- Add RLS policies for lookup tables (public read access)
ALTER TABLE id_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view id_types" ON id_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view cities" ON cities FOR SELECT USING (is_active = true);

-- Add updated_at trigger for beneficiary_documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beneficiary_documents_updated_at 
  BEFORE UPDATE ON beneficiary_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE beneficiary_documents IS 'Documents attached to beneficiary profiles';
COMMENT ON COLUMN beneficiary_documents.is_public IS 'Whether document is visible to all users or only contributors';
COMMENT ON TABLE id_types IS 'Lookup table for identification document types';
COMMENT ON TABLE cities IS 'Lookup table for cities in Egypt';
