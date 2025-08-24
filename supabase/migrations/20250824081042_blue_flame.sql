/*
  # Add zone_number column to project_equipment_assignments

  1. Changes
    - Add `zone_number` column to `project_equipment_assignments` table
    - Column type: integer, not null, default 1
    - Add index for performance optimization

  This migration adds the missing zone_number column that is required for storing
  measurement zone information in equipment assignments.
*/

-- Add zone_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_equipment_assignments' AND column_name = 'zone_number'
  ) THEN
    ALTER TABLE project_equipment_assignments ADD COLUMN zone_number integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add index for zone_number if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'project_equipment_assignments' AND indexname = 'idx_project_equipment_assignments_zone_number'
  ) THEN
    CREATE INDEX idx_project_equipment_assignments_zone_number ON project_equipment_assignments(zone_number);
  END IF;
END $$;