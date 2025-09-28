/*
  # Create measurement equipment table

  1. New Tables
    - `measurement_equipment`
      - `id` (uuid, primary key)
      - `type` (text, equipment type/category)
      - `name` (text, equipment name/model)
      - `serial_number` (text, unique serial number)
      - `verification_due_date` (date, verification expiry date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `measurement_equipment` table
    - Add policy for authenticated users to manage equipment data

  3. Indexes
    - Index on serial_number for uniqueness
    - Index on verification_due_date for sorting
    - Index on type for filtering
*/

CREATE TABLE IF NOT EXISTS measurement_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL,
  serial_number text UNIQUE NOT NULL,
  verification_due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE measurement_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage measurement equipment"
  ON measurement_equipment
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurement_equipment_serial_number 
  ON measurement_equipment (serial_number);

CREATE INDEX IF NOT EXISTS idx_measurement_equipment_verification_due_date 
  ON measurement_equipment (verification_due_date);

CREATE INDEX IF NOT EXISTS idx_measurement_equipment_type 
  ON measurement_equipment (type);

-- Trigger for updated_at
CREATE TRIGGER update_measurement_equipment_updated_at
  BEFORE UPDATE ON measurement_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();