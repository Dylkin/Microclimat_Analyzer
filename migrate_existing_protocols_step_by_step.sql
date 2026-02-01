-- Миграция существующих протоколов квалификации - пошаговый подход
-- Выполните каждый блок отдельно в Supabase SQL Editor

-- Шаг 1: Проверяем существующие протоколы квалификации
SELECT 
  id,
  project_id,
  file_name,
  document_type,
  uploaded_at
FROM project_documents 
WHERE file_name LIKE '%qualification_protocol_%'
ORDER BY uploaded_at DESC;

-- Шаг 2: Создаем записи в qualification_protocols для протоколов помещений
INSERT INTO qualification_protocols (
  project_id,
  object_type,
  object_name,
  protocol_document_id,
  status,
  created_at,
  updated_at
)
SELECT 
  pd.project_id,
  'помещение' as object_type,
  'Помещение' as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_помещение_%'
  AND pd.document_type = 'contract'
ON CONFLICT (protocol_document_id) DO NOTHING;

-- Шаг 3: Создаем записи для протоколов автомобилей
INSERT INTO qualification_protocols (
  project_id,
  object_type,
  object_name,
  protocol_document_id,
  status,
  created_at,
  updated_at
)
SELECT 
  pd.project_id,
  'автомобиль' as object_type,
  'Автомобиль' as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_автомобиль_%'
  AND pd.document_type = 'contract'
ON CONFLICT (protocol_document_id) DO NOTHING;

-- Шаг 4: Создаем записи для протоколов холодильников
INSERT INTO qualification_protocols (
  project_id,
  object_type,
  object_name,
  protocol_document_id,
  status,
  created_at,
  updated_at
)
SELECT 
  pd.project_id,
  'холодильник' as object_type,
  'Холодильник' as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_холодильник_%'
  AND pd.document_type = 'contract'
ON CONFLICT (protocol_document_id) DO NOTHING;

-- Шаг 5: Создаем записи для протоколов морозильников
INSERT INTO qualification_protocols (
  project_id,
  object_type,
  object_name,
  protocol_document_id,
  status,
  created_at,
  updated_at
)
SELECT 
  pd.project_id,
  'морозильник' as object_type,
  'Морозильник' as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_морозильник_%'
  AND pd.document_type = 'contract'
ON CONFLICT (protocol_document_id) DO NOTHING;

-- Шаг 6: Создаем записи для протоколов холодильных камер
INSERT INTO qualification_protocols (
  project_id,
  object_type,
  object_name,
  protocol_document_id,
  status,
  created_at,
  updated_at
)
SELECT 
  pd.project_id,
  'холодильная_камера' as object_type,
  'Холодильная камера' as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_холодильная_камера_%'
  AND pd.document_type = 'contract'
ON CONFLICT (protocol_document_id) DO NOTHING;

-- Шаг 7: Обновляем document_type для всех протоколов квалификации
UPDATE project_documents 
SET document_type = 'qualification_protocol'
WHERE file_name LIKE '%qualification_protocol_%'
  AND document_type = 'contract';

-- Шаг 8: Проверяем результат миграции
SELECT 
  'Migration completed' as status,
  COUNT(*) as migrated_protocols
FROM qualification_protocols;

-- Шаг 9: Показываем статистику по типам объектов
SELECT 
  object_type,
  object_name,
  COUNT(*) as protocol_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM qualification_protocols
GROUP BY object_type, object_name
ORDER BY object_type;

-- Шаг 10: Показываем общую статистику документов
SELECT 
  document_type,
  COUNT(*) as document_count
FROM project_documents
GROUP BY document_type
ORDER BY document_type;


























