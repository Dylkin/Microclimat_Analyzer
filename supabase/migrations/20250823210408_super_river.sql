/*
  # Fix project_status enum

  1. Database Changes
    - Drop and recreate project_status enum with all required values
    - Update projects table to use new enum
    - Update project_stage_assignments table to use new enum
  
  2. Data Migration
    - Preserve existing project data during enum recreation
    - Update any legacy status values to new format
  
  3. Security
    - Maintain existing RLS policies
    - Ensure data integrity during migration
*/

-- First, let's see what values currently exist
DO $$
BEGIN
  -- Create a temporary table to store existing project data
  CREATE TEMP TABLE temp_projects AS 
  SELECT id, name, description, contractor_id, contract_number, status::text as status_text, created_by, created_at, updated_at
  FROM projects;
  
  CREATE TEMP TABLE temp_stage_assignments AS
  SELECT id, project_id, stage::text as stage_text, assigned_user_id, assigned_at, completed_at, notes, created_at
  FROM project_stage_assignments;
  
  -- Drop foreign key constraints temporarily
  ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
  ALTER TABLE project_stage_assignments DROP CONSTRAINT IF EXISTS project_stage_assignments_stage_check;
  
  -- Drop the existing enum
  DROP TYPE IF EXISTS project_status CASCADE;
  
  -- Create the new enum with all required values
  CREATE TYPE project_status AS ENUM (
    'contract_negotiation',
    'protocol_preparation', 
    'testing_start',
    'testing_completion',
    'report_preparation',
    'report_approval',
    'report_printing',
    'completed',
    'requalification'
  );
  
  -- Add the status column back to projects table
  ALTER TABLE projects ADD COLUMN status_new project_status DEFAULT 'contract_negotiation';
  
  -- Migrate existing data with status mapping
  UPDATE projects SET status_new = CASE 
    WHEN temp_projects.status_text = 'contract_negotiation' THEN 'contract_negotiation'::project_status
    WHEN temp_projects.status_text = 'protocol_preparation' THEN 'protocol_preparation'::project_status
    WHEN temp_projects.status_text = 'testing_execution' THEN 'testing_completion'::project_status
    WHEN temp_projects.status_text = 'testing_start' THEN 'testing_start'::project_status
    WHEN temp_projects.status_text = 'testing_completion' THEN 'testing_completion'::project_status
    WHEN temp_projects.status_text = 'report_preparation' THEN 'report_preparation'::project_status
    WHEN temp_projects.status_text = 'report_approval' THEN 'report_approval'::project_status
    WHEN temp_projects.status_text = 'report_printing' THEN 'report_printing'::project_status
    WHEN temp_projects.status_text = 'completed' THEN 'completed'::project_status
    WHEN temp_projects.status_text = 'requalification' THEN 'requalification'::project_status
    ELSE 'contract_negotiation'::project_status
  END
  FROM temp_projects 
  WHERE projects.id = temp_projects.id;
  
  -- Drop old status column and rename new one
  ALTER TABLE projects DROP COLUMN IF EXISTS status;
  ALTER TABLE projects RENAME COLUMN status_new TO status;
  
  -- Add the stage column back to project_stage_assignments table
  ALTER TABLE project_stage_assignments ADD COLUMN stage_new project_status;
  
  -- Migrate existing stage assignments data
  UPDATE project_stage_assignments SET stage_new = CASE 
    WHEN temp_stage_assignments.stage_text = 'contract_negotiation' THEN 'contract_negotiation'::project_status
    WHEN temp_stage_assignments.stage_text = 'protocol_preparation' THEN 'protocol_preparation'::project_status
    WHEN temp_stage_assignments.stage_text = 'testing_execution' THEN 'testing_completion'::project_status
    WHEN temp_stage_assignments.stage_text = 'testing_start' THEN 'testing_start'::project_status
    WHEN temp_stage_assignments.stage_text = 'testing_completion' THEN 'testing_completion'::project_status
    WHEN temp_stage_assignments.stage_text = 'report_preparation' THEN 'report_preparation'::project_status
    WHEN temp_stage_assignments.stage_text = 'report_approval' THEN 'report_approval'::project_status
    WHEN temp_stage_assignments.stage_text = 'report_printing' THEN 'report_printing'::project_status
    WHEN temp_stage_assignments.stage_text = 'completed' THEN 'completed'::project_status
    WHEN temp_stage_assignments.stage_text = 'requalification' THEN 'requalification'::project_status
    ELSE 'contract_negotiation'::project_status
  END
  FROM temp_stage_assignments 
  WHERE project_stage_assignments.id = temp_stage_assignments.id;
  
  -- Drop old stage column and rename new one
  ALTER TABLE project_stage_assignments DROP COLUMN IF EXISTS stage;
  ALTER TABLE project_stage_assignments RENAME COLUMN stage_new TO stage;
  
  -- Make status column NOT NULL
  ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
  ALTER TABLE project_stage_assignments ALTER COLUMN stage SET NOT NULL;
  
  -- Clean up temp tables
  DROP TABLE temp_projects;
  DROP TABLE temp_stage_assignments;
  
END $$;