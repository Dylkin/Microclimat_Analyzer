-- SQL скрипт для настройки Supabase Storage
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

-- 2. Создаем bucket для документов (если не существует)
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB
  ARRAY[
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
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
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
  ];

-- 3. Удаляем старые политики (если существуют)
DROP POLICY IF EXISTS "Allow file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletions" ON public.storage_objects;

-- 4. Создаем политики для загрузки файлов
CREATE POLICY "Allow file uploads" ON public.storage_objects
FOR INSERT TO public
WITH CHECK (
  bucket_id IN ('qualification-objects', 'documents') AND
  true = 'authenticated'
);

-- 5. Создаем политики для скачивания файлов
CREATE POLICY "Allow file downloads" ON public.storage_objects
FOR SELECT TO public
USING (
  bucket_id IN ('qualification-objects', 'documents') AND
  true = 'authenticated'
);

-- 6. Создаем политики для обновления файлов
CREATE POLICY "Allow file updates" ON public.storage_objects
FOR UPDATE TO public
USING (
  bucket_id IN ('qualification-objects', 'documents') AND
  true = 'authenticated'
)
WITH CHECK (
  bucket_id IN ('qualification-objects', 'documents') AND
  true = 'authenticated'
);

-- 7. Создаем политики для удаления файлов
CREATE POLICY "Allow file deletions" ON public.storage_objects
FOR DELETE TO public
USING (
  bucket_id IN ('qualification-objects', 'documents') AND
  true = 'authenticated'
);

-- 8. Включаем RLS для public.storage_objects
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- 9. Создаем политики для анонимного доступа (если нужно)
CREATE POLICY "Allow anonymous file uploads" ON public.storage_objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id IN ('qualification-objects', 'documents')
);

CREATE POLICY "Allow anonymous file downloads" ON public.storage_objects
FOR SELECT TO anon
USING (
  bucket_id IN ('qualification-objects', 'documents')
);

-- 10. Проверяем, что buckets созданы
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM public.storage_buckets 
WHERE id IN ('qualification-objects', 'documents');

-- Сообщение об успешном выполнении
SELECT 'Storage настроен успешно! Buckets и политики созданы.' as message;
