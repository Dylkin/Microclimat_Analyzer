/*
  # Add manufacturer column to qualification_objects table

  1. Schema Changes
    - Add `manufacturer` column to `qualification_objects` table
    - Column type: TEXT (nullable)
    - Used for storing manufacturer information for equipment-type objects

  2. Notes
    - This column will be used primarily for холодильная_камера, холодильник, and морозильник types
    - Column is nullable to maintain compatibility with existing records
*/

-- Add manufacturer column to qualification_objects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qualification_objects' AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE qualification_objects ADD COLUMN manufacturer TEXT;
  END IF;
END $$;