/*
  # Add measurement_level column to project_equipment_assignments

  1. Changes
    - Add `measurement_level` column to `project_equipment_assignments` table
    - Column stores the height of measurement level in meters
    - Uses numeric type with precision for decimal values

  2. Notes
    - This fixes the schema mismatch error where the application expects `measurement_level` column
    - The column is nullable to allow for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_equipment_assignments' AND column_name = 'measurement_level'
  ) THEN
    ALTER TABLE project_equipment_assignments ADD COLUMN measurement_level numeric(5,2);
  END IF;
END $$;