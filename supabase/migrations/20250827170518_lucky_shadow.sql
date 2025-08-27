/*
  # Создание bucket для хранения документов проектов

  1. Storage Setup
    - Создание bucket 'documents' для хранения файлов договоров
    - Настройка политик доступа для bucket
    - Разрешение загрузки файлов PDF, DOC, DOCX

  2. Security
    - Политики для аутентифицированных пользователей
    - Ограничение типов файлов
    - Ограничение размера файлов (50MB)

  3. Bucket Configuration
    - Публичный доступ для чтения загруженных файлов
    - Ограничение на загрузку только для аутентифицированных пользователей
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

-- Политика для загрузки файлов (только аутентифицированные пользователи)
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Политика для чтения файлов (публичный доступ)
CREATE POLICY "Public can view documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Политика для обновления файлов (только аутентифицированные пользователи)
CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Политика для удаления файлов (только аутентифицированные пользователи)
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');