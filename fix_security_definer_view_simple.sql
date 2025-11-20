-- Простое исправление представления qualification_protocols_with_documents
-- Удаление SECURITY DEFINER свойства

-- 1. Удаляем существующее представление
DROP VIEW IF EXISTS public.qualification_protocols_with_documents;

-- 2. Создаем представление заново (по умолчанию будет SECURITY INVOKER)
CREATE VIEW public.qualification_protocols_with_documents AS
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

-- 3. Предоставляем права доступа
GRANT SELECT ON public.qualification_protocols_with_documents TO public;
GRANT SELECT ON public.qualification_protocols_with_documents TO anon;

-- 4. Проверяем результат
SELECT 'View qualification_protocols_with_documents recreated successfully' as status;





















