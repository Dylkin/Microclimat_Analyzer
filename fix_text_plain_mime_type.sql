-- SQL скрипт для исправления поддержки MIME-типа text/plain
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Обновляем bucket documents для поддержки text/plain
UPDATE public.storage_buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',  -- Добавляем поддержку text/plain
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/json',
    'application/xml'
  ]
WHERE id = 'documents';

-- 2. Обновляем bucket qualification-objects для поддержки всех типов
UPDATE public.storage_buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'text/plain',  -- Добавляем поддержку text/plain
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/json',
    'application/xml'
  ]
WHERE id = 'qualification-objects';

-- 3. Удаляем все старые политики
DROP POLICY IF EXISTS "Allow file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletions" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous access" ON public.storage_objects;

-- 4. Создаем новые политики для всех операций
CREATE POLICY "Allow all operations for authenticated users" ON public.storage_objects
FOR ALL TO public
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 5. Создаем политики для анонимного доступа
CREATE POLICY "Allow anonymous access" ON public.storage_objects
FOR ALL TO anon
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 6. Включаем RLS
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- 7. Проверяем результат
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM public.storage_buckets 
WHERE id IN ('qualification-objects', 'documents');

-- Сообщение об успешном выполнении
SELECT 'MIME-тип text/plain теперь поддерживается!' as message;






















