/*
  # Add object_type column to uploaded_files table

  1. New Columns
    - `object_type` (qualification_object_type enum, nullable)
      - Type of qualification object this file is associated with
      - Duplicated from qualification_objects for performance and analytics
      - Nullable for backward compatibility with existing records

  2. Indexes
    - Add index on object_type for efficient filtering

  3. Notes
    - Uses conditional logic to prevent errors on re-run
    - Safe operations with IF NOT EXISTS checks
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
    
    -- Add comment to explain the column purpose
    COMMENT ON COLUMN uploaded_files.object_type IS 'Type of qualification object this file is associated with. Duplicated from qualification_objects for performance and analytics.';
  END IF;
END $$;

-- Create index on object_type for efficient filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'uploaded_files' AND indexname = 'idx_uploaded_files_object_type'
  ) THEN
    CREATE INDEX idx_uploaded_files_object_type 
    ON uploaded_files (object_type) 
    WHERE object_type IS NOT NULL;
  END IF;
END $$;