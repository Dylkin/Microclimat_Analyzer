/*
  # Create qualification objects table

  1. New Tables
    - `qualification_objects`
      - `id` (uuid, primary key)
      - `contractor_id` (uuid, foreign key to contractors)
      - `type` (enum: помещение, автомобиль, холодильная_камера, холодильник, морозильник)
      - `name` (text, optional)
      - `address` (text, optional - for помещение)
      - `latitude`, `longitude` (numeric, optional - for помещение)
      - `geocoded_at` (timestamp, optional)
      - `area` (numeric, optional - for помещение)
      - `climate_system` (text, optional)
      - `plan_file_url`, `plan_file_name` (text, optional - for file uploads)
      - `vin`, `registration_number`, `body_volume` (for автомобиль)
      - `inventory_number`, `chamber_volume` (for холодильная_камера)
      - `serial_number` (for холодильник, морозильник)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on `qualification_objects` table
    - Add policies for all operations for public users (matching contractors table)

  3. Indexes
    - Index on contractor_id for efficient lookups
    - Index on type for filtering by object type
*/

-- Create enum type for qualification object types
CREATE TYPE qualification_object_type AS ENUM (
  'помещение',
  'автомобиль', 
  'холодильная_камера',
  'холодильник',
  'морозильник'
);

-- Create qualification_objects table
CREATE TABLE IF NOT EXISTS qualification_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  type qualification_object_type NOT NULL,
  
  -- Common fields
  name text,
  climate_system text,
  plan_file_url text,
  plan_file_name text,
  
  -- Fields for помещение (premises)
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  geocoded_at timestamptz,
  area numeric(10,2),
  
  -- Fields for автомобиль (vehicle)
  vin text,
  registration_number text,
  body_volume numeric(10,2),
  
  -- Fields for холодильная_камера (refrigeration chamber)
  inventory_number text,
  chamber_volume numeric(10,2),
  
  -- Fields for холодильник/морозильник (refrigerator/freezer)
  serial_number text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (matching the contractors table pattern)
CREATE POLICY "qualification_objects_all_access_policy"
  ON qualification_objects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_id 
  ON qualification_objects(contractor_id);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_type 
  ON qualification_objects(type);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_location 
  ON qualification_objects(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_qualification_objects_updated_at
  BEFORE UPDATE ON qualification_objects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();