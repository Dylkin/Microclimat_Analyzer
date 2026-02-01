/*
  # Исправление enum project_status
  
  Обновляем enum project_status, чтобы он соответствовал значениям,
  используемым в TypeScript коде.
*/

-- Сначала проверяем, какие значения уже есть в базе
DO $$
DECLARE
  current_statuses TEXT[];
  new_statuses TEXT[] := ARRAY[
    'contract_negotiation',
    'protocol_preparation',
    'testing_execution',
    'report_preparation',
    'report_approval',
    'report_printing',
    'completed'
  ];
BEGIN
  -- Получаем текущие значения enum
  SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
  INTO current_statuses
  FROM pg_enum
  WHERE enumtypid = 'project_status'::regtype;
  
  -- Если enum уже содержит правильные значения, ничего не делаем
  IF current_statuses = new_statuses THEN
    RAISE NOTICE 'Enum project_status уже содержит правильные значения';
    RETURN;
  END IF;
  
  -- Если enum не существует или содержит неправильные значения, пересоздаем его
  -- Сначала сохраняем данные проектов
  CREATE TEMP TABLE IF NOT EXISTS temp_projects_status AS
  SELECT id, status::text as status_text
  FROM projects;
  
  -- Удаляем старый enum (если существует)
  DROP TYPE IF EXISTS project_status CASCADE;
  
  -- Создаем новый enum с правильными значениями
  CREATE TYPE project_status AS ENUM (
    'contract_negotiation',
    'protocol_preparation',
    'testing_execution',
    'report_preparation',
    'report_approval',
    'report_printing',
    'completed'
  );
  
  -- Восстанавливаем колонку status в таблице projects
  ALTER TABLE projects ADD COLUMN status_new project_status DEFAULT 'contract_negotiation';
  
  -- Мигрируем данные: маппим старые значения в новые
  UPDATE projects SET status_new = CASE
    WHEN status_text = 'draft' THEN 'contract_negotiation'::project_status
    WHEN status_text = 'active' THEN 'testing_execution'::project_status
    WHEN status_text = 'completed' THEN 'completed'::project_status
    WHEN status_text = 'archived' THEN 'completed'::project_status
    WHEN status_text = 'contract_negotiation' THEN 'contract_negotiation'::project_status
    WHEN status_text = 'protocol_preparation' THEN 'protocol_preparation'::project_status
    WHEN status_text = 'testing_execution' THEN 'testing_execution'::project_status
    WHEN status_text = 'report_preparation' THEN 'report_preparation'::project_status
    WHEN status_text = 'report_approval' THEN 'report_approval'::project_status
    WHEN status_text = 'report_printing' THEN 'report_printing'::project_status
    ELSE 'contract_negotiation'::project_status
  END
  FROM temp_projects_status
  WHERE projects.id = temp_projects_status.id;
  
  -- Удаляем старую колонку и переименовываем новую
  ALTER TABLE projects DROP COLUMN IF EXISTS status;
  ALTER TABLE projects RENAME COLUMN status_new TO status;
  
  -- Устанавливаем NOT NULL и DEFAULT
  ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
  ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'contract_negotiation';
  
  -- Очищаем временную таблицу
  DROP TABLE IF EXISTS temp_projects_status;
  
  RAISE NOTICE 'Enum project_status успешно обновлен';
END $$;


