/*
  # Update measurement equipment with verification records

  1. Changes to existing table
    - Remove verification_due_date column from measurement_equipment
    - Update type column to use enum values

  2. New Tables
    - `equipment_verifications`
      - `id` (uuid, primary key)
      - `equipment_id` (uuid, foreign key to measurement_equipment)
      - `verification_start_date` (date)
      - `verification_end_date` (date)
      - `verification_file_url` (text, optional)
      - `verification_file_name` (text, optional)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on `equipment_verifications` table
    - Add policy for authenticated users to manage verification records
*/

-- Create enum for equipment types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_type') THEN
    CREATE TYPE equipment_type AS ENUM ('-', 'Testo 174T', 'Testo 174H');
  END IF;
END $$;

-- Update measurement_equipment table
DO $$
BEGIN
  -- Remove verification_due_date column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurement_equipment' AND column_name = 'verification_due_date'
  ) THEN
    ALTER TABLE measurement_equipment DROP COLUMN verification_due_date;
  END IF;

  -- Update type column to use enum if it's still text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurement_equipment' AND column_name = 'type' AND data_type = 'text'
  ) THEN
    ALTER TABLE measurement_equipment ALTER COLUMN type TYPE equipment_type USING type::equipment_type;
  END IF;
END $$;

-- Create equipment_verifications table
CREATE TABLE IF NOT EXISTS equipment_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES measurement_equipment(id) ON DELETE CASCADE,
  verification_start_date date NOT NULL,
  verification_end_date date NOT NULL,
  verification_file_url text,
  verification_file_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE equipment_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for equipment verifications
CREATE POLICY "Users can manage equipment verifications"
  ON equipment_verifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_verifications_equipment_id 
  ON equipment_verifications(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_verifications_dates 
  ON equipment_verifications(verification_start_date, verification_end_date);

-- Drop old indexes that might reference verification_due_date
DROP INDEX IF EXISTS idx_measurement_equipment_verification_due_date;