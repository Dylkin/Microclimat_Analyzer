/*
  # Update document_type enum to include new values

  1. Changes
    - Add 'layout_scheme' and 'test_data' values to document_type enum
    - Update existing enum to support new document types

  2. Security
    - No changes to RLS policies needed
*/

-- Add new values to the document_type enum
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'layout_scheme';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'test_data';