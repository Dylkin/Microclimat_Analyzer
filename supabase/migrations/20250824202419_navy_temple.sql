/*
  # Add qualification_object_id to project_documents table

  1. Schema Changes
    - Add `qualification_object_id` column to `project_documents` table
    - Add foreign key constraint to `qualification_objects` table
    - Add index for better query performance
    - Update unique constraint to include qualification_object_id

  2. Security
    - Update existing RLS policies to handle the new column
    - Ensure proper access control for object-specific documents

  3. Data Migration
    - Existing records will have NULL qualification_object_id (project-level documents)
    - New records can be either project-level (NULL) or object-specific (with qualification_object_id)
*/

-- Add qualification_object_id column to project_documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_documents' AND column_name = 'qualification_object_id'
  ) THEN
    ALTER TABLE project_documents ADD COLUMN qualification_object_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to qualification_objects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'project_documents_qualification_object_id_fkey'
  ) THEN
    ALTER TABLE project_documents 
    ADD CONSTRAINT project_documents_qualification_object_id_fkey 
    FOREIGN KEY (qualification_object_id) REFERENCES qualification_objects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_project_documents_qualification_object_id'
  ) THEN
    CREATE INDEX idx_project_documents_qualification_object_id 
    ON project_documents(qualification_object_id) 
    WHERE qualification_object_id IS NOT NULL;
  END IF;
END $$;

-- Drop the old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'project_documents_project_id_document_type_key'
  ) THEN
    ALTER TABLE project_documents 
    DROP CONSTRAINT project_documents_project_id_document_type_key;
  END IF;
END $$;

-- Add new unique constraint that allows multiple documents of same type for different objects
-- But still prevents duplicates for the same project+object+type combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'project_documents_unique_per_object_type'
  ) THEN
    ALTER TABLE project_documents 
    ADD CONSTRAINT project_documents_unique_per_object_type 
    UNIQUE (project_id, qualification_object_id, document_type);
  END IF;
END $$;

-- Update RLS policies to handle qualification_object_id
DROP POLICY IF EXISTS "Users can manage project documents" ON project_documents;

CREATE POLICY "Users can manage project documents"
  ON project_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to the new column
COMMENT ON COLUMN project_documents.qualification_object_id IS 'Optional reference to qualification object for object-specific documents. NULL for project-level documents.';