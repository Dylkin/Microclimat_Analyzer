/*
  # Создание схемы для управления проектами

  1. Новые таблицы
    - `clients` - заказчики
    - `projects` - проекты
    - `qualification_objects` - объекты квалификации
    - `qualification_stages` - этапы квалификации
    - `project_activities` - активности проекта
    - `project_documents` - документы проекта
    - `notifications` - уведомления

  2. Безопасность
    - Включен RLS для всех таблиц
    - Политики доступа на основе ролей пользователей

  3. Связи
    - Внешние ключи между таблицами
    - Каскадное удаление для связанных записей
*/

-- Создание типов
CREATE TYPE project_status AS ENUM ('draft', 'contract', 'in_progress', 'paused', 'closed');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE project_type AS ENUM ('mapping', 'testing', 'full_qualification');
CREATE TYPE qualification_object_type AS ENUM ('room', 'automobile', 'refrigerator_chamber', 'refrigerator', 'freezer', 'thermocontainer');
CREATE TYPE qualification_stage_type AS ENUM ('documentation_collection', 'protocol_preparation', 'equipment_setup', 'testing_execution', 'data_extraction', 'report_preparation', 'report_approval', 'documentation_finalization', 'closed', 'paused');
CREATE TYPE qualification_stage_status AS ENUM ('pending', 'in_progress', 'completed', 'paused');
CREATE TYPE qualification_object_status AS ENUM ('not_started', 'in_progress', 'completed', 'paused');
CREATE TYPE document_type AS ENUM ('contract', 'quote', 'plan', 'protocol', 'report', 'video', 'other');
CREATE TYPE notification_type AS ENUM ('deadline', 'approval_required', 'task_assigned', 'project_update', 'payment_due');

-- Таблица заказчиков
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  email text,
  phone text,
  address text,
  inn text,
  kpp text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text,
  type project_type NOT NULL DEFAULT 'mapping',
  status project_status NOT NULL DEFAULT 'draft',
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  manager_name text NOT NULL,
  estimated_duration integer NOT NULL DEFAULT 14,
  budget numeric,
  current_stage text DEFAULT 'preparation',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  priority project_priority NOT NULL DEFAULT 'medium',
  tags text[] DEFAULT '{}',
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица объектов квалификации
CREATE TABLE IF NOT EXISTS qualification_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type qualification_object_type NOT NULL,
  name text,
  description text,
  overall_status qualification_object_status NOT NULL DEFAULT 'not_started',
  overall_progress integer DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  current_stage_id uuid,
  technical_parameters jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица этапов квалификации
CREATE TABLE IF NOT EXISTS qualification_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES qualification_objects(id) ON DELETE CASCADE,
  type qualification_stage_type NOT NULL,
  name text NOT NULL,
  description text,
  status qualification_stage_status NOT NULL DEFAULT 'pending',
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assignee_name text,
  estimated_duration integer NOT NULL DEFAULT 1,
  actual_duration integer,
  start_date timestamptz,
  end_date timestamptz,
  planned_start_date timestamptz,
  planned_end_date timestamptz,
  order_number integer NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица активностей проекта
CREATE TABLE IF NOT EXISTS project_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now()
);

-- Таблица документов проекта
CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type document_type NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  uploaded_by text NOT NULL,
  url text NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  approved_by text,
  approved_at timestamptz,
  uploaded_at timestamptz DEFAULT now()
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для всех таблиц
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики RLS для clients
CREATE POLICY "Users can read all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('administrator', 'manager')
    )
  );

-- Политики RLS для projects
CREATE POLICY "Users can read projects they manage or are assigned to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Managers and admins can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Project managers and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'administrator'
    )
  );

-- Политики RLS для qualification_objects
CREATE POLICY "Users can read qualification objects from accessible projects"
  ON qualification_objects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

CREATE POLICY "Project managers and admins can manage qualification objects"
  ON qualification_objects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

-- Политики RLS для qualification_stages
CREATE POLICY "Users can read stages from accessible objects"
  ON qualification_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qualification_objects qo
      JOIN projects p ON p.id = qo.project_id
      WHERE qo.id = object_id 
      AND (
        p.manager_id = auth.uid() OR
        assignee_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

CREATE POLICY "Assigned users and managers can update stages"
  ON qualification_stages FOR UPDATE
  TO authenticated
  USING (
    assignee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM qualification_objects qo
      JOIN projects p ON p.id = qo.project_id
      WHERE qo.id = object_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

CREATE POLICY "Project managers and admins can manage stages"
  ON qualification_stages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qualification_objects qo
      JOIN projects p ON p.id = qo.project_id
      WHERE qo.id = object_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

-- Политики RLS для project_activities
CREATE POLICY "Users can read activities from accessible projects"
  ON project_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can create activities"
  ON project_activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Политики RLS для project_documents
CREATE POLICY "Users can read documents from accessible projects"
  ON project_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can manage documents in accessible projects"
  ON project_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_id 
      AND (
        p.manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role IN ('administrator', 'manager')
        )
      )
    )
  );

-- Политики RLS для notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_qualification_objects_project_id ON qualification_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_qualification_stages_object_id ON qualification_stages(object_id);
CREATE INDEX IF NOT EXISTS idx_qualification_stages_assignee_id ON qualification_stages(assignee_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_objects_updated_at
    BEFORE UPDATE ON qualification_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_stages_updated_at
    BEFORE UPDATE ON qualification_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();