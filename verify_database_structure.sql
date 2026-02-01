-- Проверка структуры базы данных после создания
-- Выполните этот скрипт ПОСЛЕ setup_database_structure_first.sql

-- 1. Проверяем, что таблица qualification_protocols существует
SELECT 
  'Table exists check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'qualification_protocols'
    ) THEN 'qualification_protocols table exists'
    ELSE 'qualification_protocols table does not exist'
  END as status;

-- 2. Проверяем структуру таблицы qualification_protocols
SELECT 
  'Table structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_protocols'
ORDER BY ordinal_position;

-- 3. Проверяем индексы
SELECT 
  'Indexes' as check_type,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'qualification_protocols';

-- 4. Проверяем enum document_type
SELECT 
  'Document type enum' as check_type,
  unnest(enum_range(NULL::document_type)) as document_types;

-- 5. Проверяем представление qualification_protocols_with_documents
SELECT 
  'View exists check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_name = 'qualification_protocols_with_documents'
    ) THEN 'qualification_protocols_with_documents view exists'
    ELSE 'qualification_protocols_with_documents view does not exist'
  END as status;

-- 6. Проверяем RLS политики
SELECT 
  'RLS Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'qualification_protocols';

-- 7. Проверяем триггеры
SELECT 
  'Triggers' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'qualification_protocols';

-- 8. Тестовый запрос к таблице (должен вернуть 0 записей)
SELECT 
  'Test query' as check_type,
  COUNT(*) as record_count
FROM qualification_protocols;

-- 9. Проверяем существующие протоколы квалификации в project_documents
SELECT 
  'Existing protocols in project_documents' as check_type,
  COUNT(*) as count
FROM project_documents 
WHERE file_name LIKE '%qualification_protocol_%';


























