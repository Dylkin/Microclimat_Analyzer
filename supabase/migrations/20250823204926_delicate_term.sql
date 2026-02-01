/*
  # Create project equipment assignments table

  1. New Tables
    - `project_equipment_assignments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `qualification_object_id` (uuid, foreign key to qualification_objects)
      - `equipment_id` (uuid, foreign key to measurement_equipment)
      - `assigned_at` (timestamp)
      - `completed_at` (timestamp, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `project_equipment_assignments` table
    - Add policy for authenticated users to manage equipment assignments

  3. Indexes
    - Index on project_id for fast project queries
    - Index on qualification_object_id for object-specific queries
    - Index on equipment_id for equipment usage tracking
    - Unique constraint on project_id + qualification_object_id + equipment_id
*/

CREATE TABLE IF NOT EXISTS project_equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qualification_object_id uuid NOT NULL REFERENCES qualification_objects(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES measurement_equipment(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique assignment per project/object/equipment combination
  UNIQUE(project_id, qualification_object_id, equipment_id)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_project_id 
  ON project_equipment_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_qualification_object_id 
  ON project_equipment_assignments(qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_equipment_id 
  ON project_equipment_assignments(equipment_id);

CREATE INDEX IF NOT EXISTS idx_project_equipment_assignments_completed 
  ON project_equipment_assignments(completed_at) 
  WHERE completed_at IS NOT NULL;