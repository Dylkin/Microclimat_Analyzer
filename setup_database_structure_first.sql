-- Создание структуры базы данных для протоколов квалификации
-- Выполните этот скрипт ПЕРВЫМ в Supabase SQL Editor

-- 1. Добавляем новый тип в enum document_type
-- ALTER TYPE document_type ADD VALUE 'qualification_protocol';

-- 2. Создаем таблицу для протоколов квалификации
CREATE TABLE IF NOT EXISTS qualification_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qualification_object_id UUID REFERENCES qualification_objects(id) ON DELETE SET NULL,
  object_type TEXT NOT NULL, -- 'помещение', 'автомобиль', 'холодильник', 'морозильник', 'холодильная_камера'
  object_name TEXT, -- Название объекта для отображения
  protocol_document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID, -- ID пользователя, который одобрил
  approved_at TIMESTAMP,
  rejection_reason TEXT, -- Причина отклонения
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_qualification_protocols_project_id ON qualification_protocols(project_id);
CREATE INDEX IF NOT EXISTS idx_qualification_protocols_object_type ON qualification_protocols(object_type);
CREATE INDEX IF NOT EXISTS idx_qualification_protocols_status ON qualification_protocols(status);
CREATE INDEX IF NOT EXISTS idx_qualification_protocols_created_at ON qualification_protocols(created_at);
CREATE INDEX IF NOT EXISTS idx_qualification_protocols_protocol_document_id ON qualification_protocols(protocol_document_id);

-- 4. Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_qualification_protocols_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_qualification_protocols_updated_at ON qualification_protocols;
CREATE TRIGGER trigger_update_qualification_protocols_updated_at
  BEFORE UPDATE ON qualification_protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_qualification_protocols_updated_at();

-- 6. Создаем RLS политики для безопасности
ALTER TABLE qualification_protocols ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Allow authenticated users to view qualification protocols" ON qualification_protocols;
DROP POLICY IF EXISTS "Allow authenticated users to insert qualification protocols" ON qualification_protocols;
DROP POLICY IF EXISTS "Allow authenticated users to update qualification protocols" ON qualification_protocols;
DROP POLICY IF EXISTS "Allow authenticated users to delete qualification protocols" ON qualification_protocols;

-- Политика для чтения (все авторизованные пользователи)
CREATE POLICY "Allow authenticated users to view qualification protocols" ON qualification_protocols
  FOR SELECT TO public USING (true);

-- Политика для вставки (все авторизованные пользователи)
CREATE POLICY "Allow authenticated users to insert qualification protocols" ON qualification_protocols
  FOR INSERT TO public WITH CHECK (true);

-- Политика для обновления (все авторизованные пользователи)
CREATE POLICY "Allow authenticated users to update qualification protocols" ON qualification_protocols
  FOR UPDATE TO public USING (true);

-- Политика для удаления (все авторизованные пользователи)
CREATE POLICY "Allow authenticated users to delete qualification protocols" ON qualification_protocols
  FOR DELETE TO public USING (true);

-- 7. Создаем представление для удобного получения протоколов с документами
-- Используем SECURITY INVOKER для безопасности
CREATE OR REPLACE VIEW qualification_protocols_with_documents 
WITH (security_invoker = true) AS
SELECT 
  qp.id,
  qp.project_id,
  qp.qualification_object_id,
  qp.object_type,
  qp.object_name,
  qp.status,
  qp.approved_by,
  qp.approved_at,
  qp.rejection_reason,
  qp.created_at,
  qp.updated_at,
  pd.id as document_id,
  pd.file_name,
  pd.file_url,
  pd.file_size,
  pd.mime_type,
  pd.uploaded_by,
  pd.uploaded_at
FROM qualification_protocols qp
JOIN project_documents pd ON qp.protocol_document_id = pd.id;

-- Предоставляем права доступа к представлению
GRANT SELECT ON qualification_protocols_with_documents TO public;
GRANT SELECT ON qualification_protocols_with_documents TO anon;

-- 8. Проверяем созданную структуру
SELECT 'qualification_protocols table created successfully' as status;

-- 9. Проверяем enum values
SELECT unnest(enum_range(NULL::document_type)) as document_types;

-- 10. Проверяем, что таблица существует
SELECT 
  'Table exists check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'qualification_protocols'
    ) THEN 'qualification_protocols table exists'
    ELSE 'qualification_protocols table does not exist'
  END as status;



