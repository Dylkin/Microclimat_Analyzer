/*
  # Fix RLS policy for measurement equipment

  1. Security Updates
    - Update RLS policy to allow public access for measurement equipment
    - This enables scripts and applications to manage equipment data
  
  2. Changes
    - Modify existing policy to allow all operations for public role
    - Ensure compatibility with both authenticated and anonymous access
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage measurement equipment" ON measurement_equipment;

-- Create new policy that allows all operations for public users
CREATE POLICY "measurement_equipment_all_access_policy"
  ON measurement_equipment
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);