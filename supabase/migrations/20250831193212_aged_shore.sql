/*
  # Исправление уникального ограничения для документов проекта

  1. Изменения в ограничениях
    - Удаляем старое частичное ограничение
    - Создаем новое уникальное ограничение для всех типов документов кроме test_data
    
  2. Безопасность
    - Сохраняем возможность загрузки множественных файлов test_data
    - Обеспечиваем уникальность для других типов документов
*/

-- Удаляем старое частичное ограничение если оно существует
DROP INDEX IF EXISTS project_documents_unique_per_object_type_excluding_test_data;

-- Создаем новое уникальное ограничение для всех типов кроме test_data
CREATE UNIQUE INDEX IF NOT EXISTS project_documents_unique_per_object_type 
ON project_documents (project_id, qualification_object_id, document_type) 
WHERE document_type != 'test_data';