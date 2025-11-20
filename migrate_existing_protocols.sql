-- Миграция существующих протоколов квалификации в новую структуру
-- Выполните этот скрипт ПОСЛЕ создания новой структуры

-- 1. Создаем записи в qualification_protocols для найденных документов
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
  -- Извлекаем тип объекта из имени файла
  CASE 
    WHEN pd.file_name ~ 'qualification_protocol_помещение_' THEN 'помещение'
    WHEN pd.file_name ~ 'qualification_protocol_автомобиль_' THEN 'автомобиль'
    WHEN pd.file_name ~ 'qualification_protocol_холодильник_' THEN 'холодильник'
    WHEN pd.file_name ~ 'qualification_protocol_морозильник_' THEN 'морозильник'
    WHEN pd.file_name ~ 'qualification_protocol_холодильная_камера_' THEN 'холодильная_камера'
    ELSE 'unknown'
  END as object_type,
  -- Извлекаем название объекта
  CASE 
    WHEN pd.file_name ~ 'qualification_protocol_помещение_' THEN 'Помещение'
    WHEN pd.file_name ~ 'qualification_protocol_автомобиль_' THEN 'Автомобиль'
    WHEN pd.file_name ~ 'qualification_protocol_холодильник_' THEN 'Холодильник'
    WHEN pd.file_name ~ 'qualification_protocol_морозильник_' THEN 'Морозильник'
    WHEN pd.file_name ~ 'qualification_protocol_холодильная_камера_' THEN 'Холодильная камера'
    ELSE 'Неизвестный объект'
  END as object_name,
  pd.id as protocol_document_id,
  'pending' as status,
  pd.uploaded_at as created_at,
  pd.uploaded_at as updated_at
FROM project_documents pd
WHERE pd.file_name LIKE '%qualification_protocol_%'
  AND pd.document_type = 'contract' -- Старые протоколы сохранены как 'contract'
  AND pd.file_name ~ 'qualification_protocol_(помещение|автомобиль|холодильник|морозильник|холодильная_камера)_' -- Исключаем документы с неизвестным типом
ON CONFLICT (protocol_document_id) DO NOTHING; -- Избегаем дублирования

-- 2. Обновляем document_type для протоколов квалификации
UPDATE project_documents 
SET document_type = 'qualification_protocol'
WHERE file_name LIKE '%qualification_protocol_%'
  AND document_type = 'contract';

-- 3. Проверяем результат миграции
SELECT 
  'Migration completed' as status,
  COUNT(*) as migrated_protocols
FROM qualification_protocols;

-- 4. Показываем статистику по типам объектов
SELECT 
  object_type,
  object_name,
  COUNT(*) as protocol_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM qualification_protocols
GROUP BY object_type, object_name
ORDER BY object_type;

-- 5. Показываем общую статистику документов
SELECT 
  document_type,
  COUNT(*) as document_count
FROM project_documents
GROUP BY document_type
ORDER BY document_type;
