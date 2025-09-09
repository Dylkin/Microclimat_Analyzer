/*
  # Add measurement zones column to qualification_objects table

  1. Changes
    - Add `measurement_zones` column to `qualification_objects` table
    - Column stores JSON data with measurement zones and levels
    - Default value is empty JSON object

  2. Security
    - No changes to RLS policies needed
    - Existing policies cover the new column
*/

-- Add measurement_zones column to qualification_objects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qualification_objects' AND column_name = 'measurement_zones'
  ) THEN
    ALTER TABLE qualification_objects ADD COLUMN measurement_zones jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add index for measurement_zones column for better performance
CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones 
ON qualification_objects USING gin (measurement_zones);

-- Add comment to the column
COMMENT ON COLUMN qualification_objects.measurement_zones IS 'JSON array containing measurement zones with their levels for equipment placement planning';