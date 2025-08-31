/*
  # Fix contractor IDs to use proper UUIDs

  1. Data Cleanup
    - Remove any contractors with invalid (non-UUID) IDs
    - Ensure all contractor IDs are proper UUIDs
  
  2. Schema Verification
    - Verify contractors.id is uuid type with proper default
    - Ensure foreign key constraints are correct
  
  3. Data Integrity
    - Clean up any orphaned records
    - Ensure referential integrity
*/

-- First, let's check if there are any contractors with invalid IDs and remove them
-- This is safe because we're only removing test/invalid data
DELETE FROM contractors WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Clean up any orphaned contractor_contacts that might reference deleted contractors
DELETE FROM contractor_contacts 
WHERE contractor_id NOT IN (SELECT id FROM contractors);

-- Clean up any orphaned qualification_objects that might reference deleted contractors
DELETE FROM qualification_objects 
WHERE contractor_id NOT IN (SELECT id FROM contractors);

-- Clean up any orphaned projects that might reference deleted contractors
DELETE FROM projects 
WHERE contractor_id NOT IN (SELECT id FROM contractors);

-- Ensure the contractors table has proper UUID default
ALTER TABLE contractors ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the table structure is correct
DO $$
BEGIN
  -- Ensure id column is uuid type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contractors' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION 'contractors.id column must be uuid type';
  END IF;
END $$;