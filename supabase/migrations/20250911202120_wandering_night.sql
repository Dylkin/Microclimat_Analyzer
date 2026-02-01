/*
  # Fix testing periods foreign key constraint

  1. Changes
    - Remove created_by foreign key constraint that references auth.users
    - Update created_by to reference public.users table instead
    - Add proper foreign key constraint for created_by field

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper constraints
*/

-- Remove the problematic foreign key constraint
ALTER TABLE qualification_object_testing_periods 
DROP CONSTRAINT IF EXISTS qualification_object_testing_periods_created_by_fkey;

-- Update the foreign key to reference the correct users table
ALTER TABLE qualification_object_testing_periods 
ADD CONSTRAINT qualification_object_testing_periods_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;