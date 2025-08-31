/*
  # Create project equipment assignments table

  1. New Tables
    - `project_equipment_assignments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `qualification_object_id` (uuid, foreign key to qualification_objects)
      - `equipment_id` (uuid, foreign key to measurement_equipment)
      - `zone_number` (integer)
      - `measurement_level` (numeric)
      - `assigned_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `project_equipment_assignments` table
    - Add policy for authenticated users to manage assignments

  3. Indexes
    - Index on project_id for fast project lookups
    - Index on qualification_object_id for object-based queries
    - Index on equipment_id for equipment availability checks
    - Unique constraint on project_id + qualification_object_id + equipment_id
</*/

CREATE TABLE IF NOT EXISTS project_equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qualification_object_id uuid NOT NULL REFERENCES qualification_objects(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES measurement_equipment(id) ON DELETE CASCADE,
  zone_number integer NOT NULL,
  measurement_level numeric(5,2) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_equipment_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can manage project equipment assignments"
  ON project_equipment_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_project_id 
  ON project_equipment_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_qualification_object_id 
  ON project_equipment_assignments(qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_equipment_id 
  ON project_equipment_assignments(equipment_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_completed 
  ON project_equipment_assignments(completed_at) 
  WHERE completed_at IS NOT NULL;

-- Create unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS project_equipment_assignments_project_id_qualification_obje_key
  ON project_equipment_assignments(project_id, qualification_object_id, equipment_id);