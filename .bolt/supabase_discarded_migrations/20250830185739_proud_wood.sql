/*
  # Добавление уникального ограничения на наименование оборудования

  1. Изменения
    - Добавляется уникальное ограничение на поле `name` в таблице `measurement_equipment`
    - Создается индекс для оптимизации поиска по наименованию

  2. Безопасность
    - Использование `IF NOT EXISTS` для предотвращения ошибок при повторном применении
    - Проверка существования ограничения перед добавлением
*/

-- Добавляем уникальное ограничение на поле name если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'measurement_equipment_name_key' 
    AND table_name = 'measurement_equipment'
  ) THEN
    ALTER TABLE measurement_equipment ADD CONSTRAINT measurement_equipment_name_key UNIQUE (name);
  END IF;
END $$;

-- Создаем индекс для оптимизации поиска по наименованию если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_measurement_equipment_name_unique'
  ) THEN
    CREATE INDEX idx_measurement_equipment_name_unique ON measurement_equipment (name);
  END IF;
END $$;