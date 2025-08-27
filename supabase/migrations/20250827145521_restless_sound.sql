/*
  # Отладка и исправление внешних ключей

  1. Проверка данных
    - Проверяем существование контрагента d720716b-3ccf-4964-901c-cd8c09172863
    - Проверяем все внешние ключи в таблице projects
    - Проверяем данные в связанных таблицах

  2. Исправления
    - Удаляем некорректные внешние ключи
    - Создаем правильные внешние ключи
    - Обновляем некорректные данные
*/

-- Проверяем существование контрагента
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM contractors 
    WHERE id = 'd720716b-3ccf-4964-901c-cd8c09172863'
  ) THEN
    RAISE NOTICE 'Контрагент d720716b-3ccf-4964-901c-cd8c09172863 существует в таблице contractors';
  ELSE
    RAISE NOTICE 'Контрагент d720716b-3ccf-4964-901c-cd8c09172863 НЕ найден в таблице contractors';
  END IF;
END $$;

-- Показываем все контрагенты для отладки
DO $$
DECLARE
  contractor_record RECORD;
BEGIN
  RAISE NOTICE 'Список всех контрагентов:';
  FOR contractor_record IN 
    SELECT id, name FROM contractors ORDER BY name
  LOOP
    RAISE NOTICE 'ID: %, Название: %', contractor_record.id, contractor_record.name;
  END LOOP;
END $$;

-- Проверяем текущие внешние ключи в таблице projects
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  RAISE NOTICE 'Текущие внешние ключи в таблице projects:';
  FOR fk_record IN 
    SELECT 
      conname as constraint_name,
      pg_get_constraintdef(oid) as constraint_definition
    FROM pg_constraint 
    WHERE conrelid = 'projects'::regclass 
    AND contype = 'f'
  LOOP
    RAISE NOTICE 'Ограничение: %, Определение: %', fk_record.constraint_name, fk_record.constraint_definition;
  END LOOP;
END $$;

-- Удаляем все внешние ключи из таблицы projects для пересоздания
DO $$
BEGIN
  -- Удаляем внешний ключ на auth.users если он существует
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'projects_created_by_fkey' 
    AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_created_by_fkey;
    RAISE NOTICE 'Удален внешний ключ projects_created_by_fkey';
  END IF;

  -- Удаляем внешний ключ на contractors если он существует
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'projects_contractor_id_fkey' 
    AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_contractor_id_fkey;
    RAISE NOTICE 'Удален внешний ключ projects_contractor_id_fkey';
  END IF;
END $$;

-- Обновляем некорректные значения created_by
UPDATE projects 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM users WHERE id = projects.created_by
);

-- Обновляем некорректные значения contractor_id
UPDATE projects 
SET contractor_id = (SELECT id FROM contractors LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM contractors WHERE id = projects.contractor_id
);

-- Создаем правильные внешние ключи
ALTER TABLE projects 
ADD CONSTRAINT projects_contractor_id_fkey 
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE;

ALTER TABLE projects 
ADD CONSTRAINT projects_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Пересоздаем индексы
DROP INDEX IF EXISTS idx_projects_contractor_id;
DROP INDEX IF EXISTS idx_projects_created_by;

CREATE INDEX idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX idx_projects_created_by ON projects(created_by) WHERE created_by IS NOT NULL;

RAISE NOTICE 'Внешние ключи и индексы успешно пересозданы';