/*
  # Добавление колонки object_type в таблицу uploaded_files

  1. Изменения в таблице uploaded_files
    - Добавляем колонку `object_type` типа `qualification_object_type`
    - Колонка может быть NULL (для существующих записей)
    - Добавляем индекс для оптимизации запросов

  2. Безопасность
    - Используем IF NOT EXISTS для предотвращения ошибок при повторном применении
    - Колонка добавляется как nullable для совместимости с существующими данными
*/

-- Добавляем колонку object_type в таблицу uploaded_files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_files' AND column_name = 'object_type'
  ) THEN
    ALTER TABLE uploaded_files 
    ADD COLUMN object_type qualification_object_type;
    
    -- Добавляем комментарий к колонке
    COMMENT ON COLUMN uploaded_files.object_type IS 'Type of qualification object this file is associated with. Duplicated from qualification_objects for performance and analytics.';
  END IF;
END $$;

-- Создаем индекс для оптимизации запросов по object_type
CREATE INDEX IF NOT EXISTS idx_uploaded_files_object_type 
ON uploaded_files (object_type) 
WHERE object_type IS NOT NULL;