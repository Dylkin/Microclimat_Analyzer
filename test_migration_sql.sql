-- Тестовый скрипт для проверки миграции протоколов квалификации
-- Выполните этот скрипт для проверки перед основной миграцией

-- 1. Проверяем существующие протоколы квалификации
SELECT 
  'Existing qualification protocols' as check_type,
  COUNT(*) as count
FROM project_documents 
WHERE file_name LIKE '%qualification_protocol_%';

-- 2. Показываем примеры найденных протоколов
SELECT 
  'Sample protocols' as check_type,
  id,
  project_id,
  file_name,
  document_type,
  uploaded_at
FROM project_documents 
WHERE file_name LIKE '%qualification_protocol_%'
ORDER BY uploaded_at DESC
LIMIT 5;

-- 3. Проверяем типы объектов в именах файлов
SELECT 
  'Object types found' as check_type,
  CASE 
    WHEN file_name LIKE '%qualification_protocol_помещение_%' THEN 'помещение'
    WHEN file_name LIKE '%qualification_protocol_автомобиль_%' THEN 'автомобиль'
    WHEN file_name LIKE '%qualification_protocol_холодильник_%' THEN 'холодильник'
    WHEN file_name LIKE '%qualification_protocol_морозильник_%' THEN 'морозильник'
    WHEN file_name LIKE '%qualification_protocol_холодильная_камера_%' THEN 'холодильная_камера'
    ELSE 'unknown'
  END as object_type,
  COUNT(*) as count
FROM project_documents 
WHERE file_name LIKE '%qualification_protocol_%'
GROUP BY 
  CASE 
    WHEN file_name LIKE '%qualification_protocol_помещение_%' THEN 'помещение'
    WHEN file_name LIKE '%qualification_protocol_автомобиль_%' THEN 'автомобиль'
    WHEN file_name LIKE '%qualification_protocol_холодильник_%' THEN 'холодильник'
    WHEN file_name LIKE '%qualification_protocol_морозильник_%' THEN 'морозильник'
    WHEN file_name LIKE '%qualification_protocol_холодильная_камера_%' THEN 'холодильная_камера'
    ELSE 'unknown'
  END
ORDER BY count DESC;

-- 4. Проверяем, существует ли таблица qualification_protocols
SELECT 
  'Table exists check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'qualification_protocols'
    ) THEN 'qualification_protocols table exists'
    ELSE 'qualification_protocols table does not exist'
  END as status;

-- 5. Проверяем enum document_type
SELECT 
  'Document type enum' as check_type,
  unnest(enum_range(NULL::document_type)) as document_types;


























