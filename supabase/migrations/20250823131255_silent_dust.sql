/*
  # Add object_type column to uploaded_files table

  1. New Columns
    - `object_type` (qualification_object_type, nullable)
      - Type of qualification object this file is associated with
      - Duplicated from qualification_objects for performance and analytics
      - Nullable to maintain compatibility with existing files

  2. Indexes
    - Add index on object_type for better query performance when filtering by object type

  3. Notes
    - Column will be populated automatically when files are uploaded through the interface
    - Allows for faster filtering and analytics without complex JOINs
    - Maintains data integrity even if qualification objects are modified
*/

-- Add object_type column to uploaded_files table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_files' AND column_name = 'object_type'
  ) THEN
    ALTER TABLE uploaded_files 
    ADD COLUMN object_type qualification_object_type;
    
    -- Add comment to explain the purpose
    COMMENT ON COLUMN uploaded_files.object_type IS 'Type of qualification object this file is associated with. Duplicated from qualification_objects for performance and analytics.';
  END IF;
END $$;

-- Add index for better performance when filtering by object type
CREATE INDEX IF NOT EXISTS idx_uploaded_files_object_type 
ON uploaded_files (object_type) 
WHERE object_type IS NOT NULL;