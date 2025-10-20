-- Add anonymous column to contributions table
ALTER TABLE contributions ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT false; 