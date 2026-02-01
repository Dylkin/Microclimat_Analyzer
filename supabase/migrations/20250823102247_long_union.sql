/*
  # Add object_type column to uploaded_files table

  1. Changes
    - Add `object_type` column to `uploaded_files` table
    - Column type: `qualification_object_type` (enum)
    - Column is nullable to maintain compatibility with existing records
    - Add index for performance when filtering by object type

  2. Purpose
    - Link uploaded files directly to qualification object types
    - Improve query performance for filtering files by object type
    - Enable analytics and reporting grouped by object types
    - Maintain data consistency and validation
*/

-- Add object_type column to uploaded_files table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_files' AND column_name = 'object_type'
  ) THEN
    ALTER TABLE uploaded_files ADD COLUMN object_type qualification_object_type;
  END IF;
END $$;

-- Add index for performance when filtering by object type
CREATE INDEX IF NOT EXISTS idx_uploaded_files_object_type 
ON uploaded_files (object_type) 
WHERE object_type IS NOT NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN uploaded_files.object_type IS 'Type of qualification object this file is associated with. Duplicated from qualification_objects for performance and analytics.';