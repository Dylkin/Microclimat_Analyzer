/*
  # Добавить таблицу периодов испытаний для объектов квалификации

  1. Новые таблицы
    - `qualification_object_testing_periods`
      - `id` (uuid, primary key)
      - `qualification_object_id` (uuid, foreign key)
      - `project_id` (uuid, foreign key)
      - `planned_start_date` (date)
      - `planned_end_date` (date)
      - `actual_start_date` (date, nullable)
      - `actual_end_date` (date, nullable)
      - `status` (enum: planned, in_progress, completed, cancelled)
      - `notes` (text, nullable)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `qualification_object_testing_periods`
    - Добавить политики для аутентифицированных пользователей

  3. Индексы
    - Индекс по qualification_object_id
    - Индекс по project_id
    - Индекс по датам планирования
*/

-- Создаем enum для статуса испытаний
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'testing_period_status') THEN
    CREATE TYPE testing_period_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- Создаем таблицу периодов испытаний
CREATE TABLE IF NOT EXISTS qualification_object_testing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_object_id uuid NOT NULL,
  project_id uuid NOT NULL,
  planned_start_date date NOT NULL,
  planned_end_date date NOT NULL,
  actual_start_date date,
  actual_end_date date,
  status testing_period_status DEFAULT 'planned' NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT qualification_object_testing_periods_qualification_object_id_fkey 
    FOREIGN KEY (qualification_object_id) REFERENCES qualification_objects(id) ON DELETE CASCADE,
  CONSTRAINT qualification_object_testing_periods_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT qualification_object_testing_periods_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT qualification_object_testing_periods_dates_check 
    CHECK (planned_end_date >= planned_start_date),
  CONSTRAINT qualification_object_testing_periods_actual_dates_check 
    CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date)
);

-- Включаем RLS
ALTER TABLE qualification_object_testing_periods ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Users can manage testing periods"
  ON qualification_object_testing_periods
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_qualification_object_id 
  ON qualification_object_testing_periods(qualification_object_id);

CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_project_id 
  ON qualification_object_testing_periods(project_id);

CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_planned_dates 
  ON qualification_object_testing_periods(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_status 
  ON qualification_object_testing_periods(status);

CREATE INDEX IF NOT EXISTS idx_qualification_object_testing_periods_created_by 
  ON qualification_object_testing_periods(created_by);

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_qualification_object_testing_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qualification_object_testing_periods_updated_at
  BEFORE UPDATE ON qualification_object_testing_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_qualification_object_testing_periods_updated_at();