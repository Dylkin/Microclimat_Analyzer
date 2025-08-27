/*
  # Исправление enum project_status

  1. Изменения
    - Добавляем отсутствующее значение 'testing_execution' в enum project_status
    - Значение используется в коде но отсутствует в базе данных

  2. Безопасность
    - Используем безопасное добавление значения в enum
    - Проверяем существование значения перед добавлением
*/

-- Добавляем отсутствующее значение в enum project_status
DO $$
BEGIN
  -- Проверяем, существует ли уже значение 'testing_execution'
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'testing_execution' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'project_status'
    )
  ) THEN
    -- Добавляем новое значение в enum
    ALTER TYPE project_status ADD VALUE 'testing_execution';
    
    -- Логируем добавление
    RAISE NOTICE 'Добавлено значение testing_execution в enum project_status';
  ELSE
    RAISE NOTICE 'Значение testing_execution уже существует в enum project_status';
  END IF;
END $$;