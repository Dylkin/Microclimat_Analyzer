/*
  # Создание bucket для документов проектов

  1. Storage
    - Создание bucket `documents` для хранения файлов договоров и коммерческих предложений
    - Настройка лимитов размера файлов (50MB)
    - Ограничение типов файлов (PDF, DOC, DOCX)
  
  2. Политики безопасности
    - Аутентифицированные пользователи могут загружать документы
    - Публичный доступ для просмотра документов
    - Аутентифицированные пользователи могут обновлять и удалять документы
*/

-- Создание bucket для документов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Политики доступа для bucket documents
CREATE POLICY IF NOT EXISTS "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY IF NOT EXISTS "Public can view documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY IF NOT EXISTS "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');