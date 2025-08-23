/*
  # Update project status enum

  1. Enum Updates
    - Add new status 'testing_start' (Начало испытаний)
    - Rename 'testing_execution' to 'testing_completion' (Завершение испытаний)
    - Add new status 'requalification' (Реквалификация)

  2. Data Migration
    - Update existing records with old status to new status
    - Preserve data integrity during enum modification

  3. Order of statuses
    - contract_negotiation
    - protocol_preparation
    - testing_start (new)
    - testing_completion (renamed from testing_execution)
    - report_preparation
    - report_approval
    - report_printing
    - completed
    - requalification (new)
*/

-- First, add the new enum values
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'testing_start';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'testing_completion';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'requalification';

-- Update any existing records that might have the old 'testing_execution' status
-- Since this is a new system, there likely aren't any, but this ensures data integrity
UPDATE projects 
SET status = 'testing_completion'::project_status 
WHERE status = 'testing_execution'::project_status;

-- Note: We cannot remove 'testing_execution' from the enum directly in PostgreSQL
-- without recreating the enum, but since it's not used anymore, it's safe to leave it