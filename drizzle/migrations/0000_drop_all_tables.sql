-- Drop all tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS "localization" CASCADE;
DROP TABLE IF EXISTS "communications" CASCADE;
DROP TABLE IF EXISTS "sponsorships" CASCADE;
DROP TABLE IF EXISTS "contributions" CASCADE;
DROP TABLE IF EXISTS "project_cycles" CASCADE;
DROP TABLE IF EXISTS "case_updates" CASCADE;
DROP TABLE IF EXISTS "case_status_history" CASCADE;
DROP TABLE IF EXISTS "case_images" CASCADE;
DROP TABLE IF EXISTS "cases" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "case_categories" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE; 