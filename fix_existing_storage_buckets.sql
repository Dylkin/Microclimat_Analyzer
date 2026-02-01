-- SQL скрипт для обновления существующих Supabase Storage buckets
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Обновляем существующий bucket для объектов квалификации
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
    'text/plain',
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
    'video/webm'
  ]
WHERE id = 'qualification-objects';

-- 2. Обновляем существующий bucket для документов (если существует)
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
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/webp',
    'image/tiff'
  ]
WHERE id = 'documents';

-- 3. Удаляем все старые политики
DROP POLICY IF EXISTS "Allow file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletions" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file downloads" ON public.storage_objects;

-- 4. Создаем простые политики для всех операций
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
SELECT 'Storage buckets обновлены успешно!' as message;






















