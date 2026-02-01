/*
  # Добавление полей для данных по испытаниям

  1. Изменения в таблице qualification_objects
    - Добавляем поле `test_data_file_url` для хранения URL файла с данными по испытаниям
    - Добавляем поле `test_data_file_name` для хранения имени файла с данными по испытаниям

  2. Обновление индексов
    - Добавляем индекс для быстрого поиска объектов с данными по испытаниям
*/

-- Добавляем поля для данных по испытаниям
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qualification_objects' AND column_name = 'test_data_file_url'
  ) THEN
    ALTER TABLE qualification_objects ADD COLUMN test_data_file_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qualification_objects' AND column_name = 'test_data_file_name'
  ) THEN
    ALTER TABLE qualification_objects ADD COLUMN test_data_file_name text;
  END IF;
END $$;

-- Добавляем индекс для поиска объектов с данными по испытаниям
CREATE INDEX IF NOT EXISTS idx_qualification_objects_test_data 
ON qualification_objects (test_data_file_url) 
WHERE test_data_file_url IS NOT NULL;