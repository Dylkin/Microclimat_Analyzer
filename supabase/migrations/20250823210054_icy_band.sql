/*
  # Update project statuses

  1. Changes to project_status enum
    - Rename 'testing_execution' to 'testing_completion'
    - Add 'testing_start' before 'testing_completion'
    - Add 'requalification' after 'completed'

  2. Security
    - Maintain existing RLS policies
    - Update any references to old status values
*/

-- Add new enum values and rename existing ones
-- First, add the new values to the enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'testing_start';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'testing_completion';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'requalification';

-- Update existing records that use 'testing_execution' to use 'testing_completion'
UPDATE projects 
SET status = 'testing_completion' 
WHERE status = 'testing_execution';

-- Update project_stage_assignments table as well
UPDATE project_stage_assignments 
SET stage = 'testing_completion' 
WHERE stage = 'testing_execution';

-- Note: We cannot remove the old 'testing_execution' value from the enum in PostgreSQL
-- without recreating the enum, but the new values are now available and old data is migrated