/*
  # Создание системы проектов квалификации

  1. Новые таблицы
    - `projects` - основная таблица проектов
    - `project_qualification_objects` - связь проектов с объектами квалификации
    - `project_stage_assignments` - назначения исполнителей на этапы

  2. Безопасность
    - Включение RLS для всех таблиц
    - Политики доступа для аутентифицированных пользователей

  3. Индексы
    - Оптимизация запросов по проектам и связанным данным
*/

-- Создание enum для статусов проектов
CREATE TYPE project_status AS ENUM (
  'contract_negotiation',
  'protocol_preparation', 
  'testing_execution',
  'report_preparation',
  'report_approval',
  'report_printing',
  'completed'
);

-- Основная таблица проектов
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  contract_number text,
  status project_status NOT NULL DEFAULT 'contract_negotiation',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Связь проектов с объектами квалификации
CREATE TABLE IF NOT EXISTS project_qualification_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qualification_object_id uuid NOT NULL REFERENCES qualification_objects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, qualification_object_id)
);

-- Назначения исполнителей на этапы проектов
CREATE TABLE IF NOT EXISTS project_stage_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage project_status NOT NULL,
  assigned_user_id uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, stage)
);

-- Включение RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stage_assignments ENABLE ROW LEVEL SECURITY;

-- Политики доступа для проектов
CREATE POLICY "projects_all_access_policy"
  ON projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Политики доступа для связей с объектами квалификации
CREATE POLICY "project_qualification_objects_all_access_policy"
  ON project_qualification_objects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Политики доступа для назначений этапов
CREATE POLICY "project_stage_assignments_all_access_policy"
  ON project_stage_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_qualification_objects_project_id ON project_qualification_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_project_qualification_objects_qualification_object_id ON project_qualification_objects(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_project_stage_assignments_project_id ON project_stage_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stage_assignments_assigned_user_id ON project_stage_assignments(assigned_user_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();