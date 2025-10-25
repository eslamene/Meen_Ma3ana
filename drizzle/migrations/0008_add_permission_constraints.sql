-- Migration: Add NOT NULL constraints to permissions table
-- This ensures all permissions have resource and action fields

-- First, update any existing permissions that might have NULL values
UPDATE permissions 
SET resource = SPLIT_PART(name, ':', 1)
WHERE resource IS NULL OR resource = '';

UPDATE permissions 
SET action = REPLACE(SUBSTRING(name FROM POSITION(':' IN name) + 1), ':', '_')
WHERE action IS NULL OR action = '';

-- Add NOT NULL constraints
ALTER TABLE permissions ALTER COLUMN resource SET NOT NULL;
ALTER TABLE permissions ALTER COLUMN action SET NOT NULL;

-- Add check constraints to prevent empty strings
ALTER TABLE permissions ADD CONSTRAINT permissions_resource_not_empty CHECK (resource != '');
ALTER TABLE permissions ADD CONSTRAINT permissions_action_not_empty CHECK (action != '');
