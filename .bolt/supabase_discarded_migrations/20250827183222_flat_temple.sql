/*
  # Create documents bucket for project files

  1. Storage Setup
    - Create 'documents' bucket for project documents
    - Configure public access for viewing
    - Set file size limits and allowed file types

  2. Security Policies
    - Allow authenticated users to upload documents
    - Allow public read access for documents
    - Allow authenticated users to update/delete their documents

  3. Configuration
    - Max file size: 50MB
    - Allowed types: PDF, DOC, DOCX
    - Public access enabled for viewing
*/

-- Create the documents bucket if it doesn't exist
DO $$
BEGIN
  -- Check if bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'documents',
      'documents',
      true,
      52428800, -- 50MB in bytes
      ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    );
    
    RAISE NOTICE 'Created documents bucket';
  ELSE
    RAISE NOTICE 'Documents bucket already exists';
  END IF;
END $$;

-- Create storage policies for the documents bucket
DO $$
BEGIN
  -- Policy for authenticated users to upload documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents');
    
    RAISE NOTICE 'Created upload policy for documents bucket';
  ELSE
    RAISE NOTICE 'Upload policy for documents bucket already exists';
  END IF;

  -- Policy for public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for documents'
  ) THEN
    CREATE POLICY "Public read access for documents"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'documents');
    
    RAISE NOTICE 'Created read policy for documents bucket';
  ELSE
    RAISE NOTICE 'Read policy for documents bucket already exists';
  END IF;

  -- Policy for authenticated users to update their documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update their documents'
  ) THEN
    CREATE POLICY "Authenticated users can update their documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documents');
    
    RAISE NOTICE 'Created update policy for documents bucket';
  ELSE
    RAISE NOTICE 'Update policy for documents bucket already exists';
  END IF;

  -- Policy for authenticated users to delete their documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete their documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete their documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents');
    
    RAISE NOTICE 'Created delete policy for documents bucket';
  ELSE
    RAISE NOTICE 'Delete policy for documents bucket already exists';
  END IF;
END $$;