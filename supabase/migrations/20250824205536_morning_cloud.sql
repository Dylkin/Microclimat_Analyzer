/*
  # Update project documents to use Supabase Storage

  1. Schema Changes
    - Replace `file_content` column with `file_url` column in `project_documents` table
    - Update column type from BYTEA to TEXT for storing file URLs

  2. Storage Setup
    - Files will be stored in Supabase Storage bucket instead of database
    - More efficient for large files and better performance
*/

-- Add file_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_documents' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE project_documents ADD COLUMN file_url text;
  END IF;
END $$;

-- Drop file_content column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_documents' AND column_name = 'file_content'
  ) THEN
    ALTER TABLE project_documents DROP COLUMN file_content;
  END IF;
END $$;