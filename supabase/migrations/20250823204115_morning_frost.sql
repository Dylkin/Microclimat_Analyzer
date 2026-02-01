/*
  # Create project documents table

  1. New Tables
    - `project_documents`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `document_type` (text, enum: 'commercial_offer', 'contract')
      - `file_name` (text, original file name)
      - `file_size` (bigint, file size in bytes)
      - `file_content` (bytea, file content as binary data)
      - `mime_type` (text, MIME type of the file)
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `uploaded_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `project_documents` table
    - Add policy for authenticated users to manage documents of their projects

  3. Indexes
    - Index on project_id for fast lookups
    - Index on document_type for filtering
    - Unique constraint on project_id + document_type (one document per type per project)
*/

-- Create enum for document types
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('commercial_offer', 'contract');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_content bytea NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure only one document per type per project
  UNIQUE(project_id, document_type)
);

-- Enable RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage documents
CREATE POLICY "Users can manage project documents"
  ON project_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id 
  ON project_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_project_documents_type 
  ON project_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by 
  ON project_documents(uploaded_by);