/*
  # Remove unique constraint for test_data documents

  1. Changes
    - Remove unique constraint that prevents multiple test_data documents
    - Allow multiple test_data files per project and qualification object
    - Keep constraint for other document types (layout_scheme, etc.)

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Drop the unique constraint that prevents multiple test_data documents
ALTER TABLE project_documents 
DROP CONSTRAINT IF EXISTS project_documents_unique_per_object_type;

-- Create a new partial unique constraint that excludes test_data documents
-- This allows multiple test_data files while keeping uniqueness for other document types
CREATE UNIQUE INDEX project_documents_unique_per_object_type_excluding_test_data
ON project_documents (project_id, qualification_object_id, document_type)
WHERE document_type != 'test_data';