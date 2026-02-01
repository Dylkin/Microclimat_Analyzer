/*
  # Fix RLS policies for uploaded_files table

  1. Security Changes
    - Drop existing restrictive RLS policies on uploaded_files table
    - Create new policies that allow authenticated users to:
      - INSERT records with their own user_id
      - SELECT their own records
      - UPDATE their own records  
      - DELETE their own records
    - Ensure policies work with auth.uid() function properly

  2. Policy Details
    - Allow INSERT when user_id matches authenticated user
    - Allow SELECT when user_id matches authenticated user
    - Allow UPDATE when user_id matches authenticated user
    - Allow DELETE when user_id matches authenticated user
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own files" ON uploaded_files;
DROP POLICY IF EXISTS "user_files_full_access_policy" ON uploaded_files;

-- Create new comprehensive policies for authenticated users
CREATE POLICY "authenticated_users_can_insert_own_files"
  ON uploaded_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_select_own_files"
  ON uploaded_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_files"
  ON uploaded_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_files"
  ON uploaded_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);