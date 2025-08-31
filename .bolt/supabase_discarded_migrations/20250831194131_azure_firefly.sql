/*
  # Добавление уникального ограничения для project_documents

  1. Изменения в таблице project_documents
    - Добавляется уникальное ограничение на комбинацию (project_id, qualification_object_id, document_type)
    - Ограничение исключает документы типа 'test_data' для возможности множественной загрузки

  2. Безопасность
    - Ограничение добавляется только если его еще нет
    - Используется условная логика для предотвращения ошибок при повторном применении миграции
*/

-- Добавляем уникальное ограничение для всех типов документов кроме test_data
DO $$
BEGIN
  -- Проверяем, существует ли уже ограничение
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_documents_unique_per_object_type' 
    AND table_name = 'project_documents'
  ) THEN
    -- Добавляем уникальное ограничение
    ALTER TABLE project_documents 
    ADD CONSTRAINT project_documents_unique_per_object_type 
    UNIQUE (project_id, qualification_object_id, document_type)
    WHERE document_type != 'test_data';
  END IF;
END $$;