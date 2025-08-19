/*
  # Fix RLS policies for users table to prevent infinite recursion

  1. Problem
    - Current policies query the users table within policies for the users table
    - This creates infinite recursion when trying to access user data

  2. Solution
    - Remove recursive policies that query users table within users table policies
    - Use simple uid() = id for user access to own data
    - For admin access, we'll handle it at the application level or use JWT claims
    - Keep it simple to avoid recursion

  3. Changes
    - Drop all existing policies on users table
    - Create simple, non-recursive policies
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Администраторы могут управлять вс" ON users;
DROP POLICY IF EXISTS "Пользователи могут обновлять свои" ON users;
DROP POLICY IF EXISTS "Пользователи могут читать свои да" ON users;
DROP POLICY IF EXISTS "Руководители могут читать всех по" ON users;

-- Create simple, non-recursive policies
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- For now, we'll handle admin access at the application level
-- This avoids the recursion issue entirely
-- Admins will use service role key for admin operations