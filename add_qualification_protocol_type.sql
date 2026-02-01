-- Добавление нового типа документа "qualification_protocol" в enum document_type
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем текущие значения enum
SELECT unnest(enum_range(NULL::document_type)) as current_types;

-- Добавляем новый тип в enum
-- ALTER TYPE document_type ADD VALUE 'qualification_protocol';

-- Проверяем обновленные значения enum
SELECT unnest(enum_range(NULL::document_type)) as updated_types;

-- Проверяем структуру таблицы project_documents
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'project_documents' 
AND column_name = 'document_type';

-- Проверяем, что изменения применились
SELECT 'qualification_protocol'::document_type as test_new_type;


























