/*
  # Fix UUID comparison error in uploaded_files RLS policies

  1. Security Policies
    - Drop all existing policies that cause UUID/text comparison errors
    - Create new policies with proper UUID casting
    - Ensure auth.uid() is properly cast to UUID type
    - Add policies for all CRUD operations (INSERT, SELECT, UPDATE, DELETE)

  2. Changes
    - Remove problematic policies with UUID = text comparisons
    - Use proper UUID casting with ::uuid
    - Ensure compatibility with Supabase auth system
*/

-- Drop all existing policies for uploaded_files table
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_files" ON uploaded_files;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_files" ON uploaded_files;
DROP POLICY IF EXISTS "authenticated_users_can_select_own_files" ON uploaded_files;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_files" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_insert_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_select_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_update_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_delete_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_public_access" ON uploaded_files;

-- Create new policies with proper UUID casting
CREATE POLICY "uploaded_files_insert_own" ON uploaded_files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "uploaded_files_select_own" ON uploaded_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "uploaded_files_update_own" ON uploaded_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "uploaded_files_delete_own" ON uploaded_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::uuid);