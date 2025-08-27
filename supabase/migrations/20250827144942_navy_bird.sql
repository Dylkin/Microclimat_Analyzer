/*
  # Fix projects created_by foreign key constraint

  1. Changes
    - Drop existing foreign key constraint that references auth.users
    - Add new foreign key constraint that references local users table
    - Update any invalid created_by values to NULL
    - Add index for performance

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- First, update any invalid created_by values to NULL
UPDATE projects 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM users);

-- Drop the existing foreign key constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_created_by_fkey;

-- Add new foreign key constraint referencing local users table
ALTER TABLE projects 
ADD CONSTRAINT projects_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Recreate index for performance
DROP INDEX IF EXISTS idx_projects_created_by;
CREATE INDEX idx_projects_created_by ON projects(created_by) WHERE created_by IS NOT NULL;