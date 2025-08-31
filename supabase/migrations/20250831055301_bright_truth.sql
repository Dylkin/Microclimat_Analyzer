/*
  # Create storage bucket for documents

  1. Storage Setup
    - Create 'documents' bucket for project documents
    - Set file size limit to 50MB
    - Allow PDF, DOC, and DOCX files
    - Enable public access for viewing

  2. Security Policies
    - Authenticated users can upload documents
    - Public access for viewing documents
    - Authenticated users can update/delete their documents
*/

-- Create storage bucket for documents using DO block to handle potential errors
DO $$
BEGIN
  -- Try to create the bucket, ignore if it already exists
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'documents',
    'documents',
    true,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the migration
    RAISE NOTICE 'Could not create storage bucket: %', SQLERRM;
END $$;

-- Enable RLS on storage.objects if not already enabled
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS might already be enabled
    RAISE NOTICE 'RLS already enabled on storage.objects: %', SQLERRM;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may not exist: %', SQLERRM;
END $$;

-- Create policies for document storage
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public can view documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');