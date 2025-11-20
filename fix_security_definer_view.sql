-- Исправление представления qualification_protocols_with_documents
-- Удаление SECURITY DEFINER свойства для улучшения безопасности

-- 1. Удаляем существующее представление
DROP VIEW IF EXISTS public.qualification_protocols_with_documents;

-- 2. Создаем представление заново без SECURITY DEFINER
CREATE VIEW public.qualification_protocols_with_documents 
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

-- 3. Предоставляем права доступа к представлению
GRANT SELECT ON public.qualification_protocols_with_documents TO public;
GRANT SELECT ON public.qualification_protocols_with_documents TO anon;

-- 4. Проверяем, что представление создано корректно
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'qualification_protocols_with_documents';

-- 5. Проверяем права доступа
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'qualification_protocols_with_documents'
  AND table_schema = 'public';

-- 6. Проверяем, что SECURITY DEFINER не установлен
SELECT 
  c.relname as view_name,
  c.relkind,
  CASE 
    WHEN c.relkind = 'v' THEN 'View'
    ELSE 'Not a view'
  END as object_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE oid = c.oid 
      AND reloptions IS NOT NULL 
      AND 'security_invoker=true' = ANY(reloptions)
    ) THEN 'SECURITY INVOKER'
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE oid = c.oid 
      AND reloptions IS NOT NULL 
      AND 'security_definer=true' = ANY(reloptions)
    ) THEN 'SECURITY DEFINER'
    ELSE 'Default (SECURITY DEFINER)'
  END as security_type
FROM pg_class c
WHERE c.relname = 'qualification_protocols_with_documents'
  AND c.relkind = 'v';





















