-- Add year_of_birth column to beneficiaries table
-- This will store the year of birth instead of age for better data consistency

-- Add the year_of_birth column
ALTER TABLE beneficiaries 
ADD COLUMN year_of_birth INTEGER;

-- Add a comment to explain the column
COMMENT ON COLUMN beneficiaries.year_of_birth IS 'Year of birth (calculated from age input)';

-- Create an index on year_of_birth for better query performance
CREATE INDEX idx_beneficiaries_year_of_birth ON beneficiaries(year_of_birth);

-- Optional: Migrate existing age data to year_of_birth if age column exists
-- Note: This assumes age column exists and contains valid age values
-- Uncomment the following lines if you want to migrate existing data:

-- UPDATE beneficiaries 
-- SET year_of_birth = EXTRACT(YEAR FROM CURRENT_DATE) - age 
-- WHERE age IS NOT NULL AND age > 0 AND age < 150;

-- After migration, you can drop the age column if desired:
-- ALTER TABLE beneficiaries DROP COLUMN age;
