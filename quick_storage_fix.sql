-- Быстрое исправление Supabase Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Предоставляем права доступа
GRANT SELECT ON public.storage_buckets TO public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_objects TO public, anon;

-- 2. Создаем/обновляем bucket documents
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'application/pdf', 'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream', 'text/plain', 'image/jpeg',
    'image/png', 'image/gif', 'image/bmp', 'image/svg+xml',
    'image/webp', 'image/tiff'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- 3. Создаем/обновляем bucket qualification-objects
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualification-objects',
  'qualification-objects',
  true,
  10485760,
  ARRAY[
    'application/pdf', 'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream', 'text/plain', 'image/jpeg',
    'image/png', 'image/gif', 'image/bmp', 'image/svg+xml',
    'image/webp', 'image/tiff', 'video/mp4', 'video/avi',
    'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- 4. Настраиваем RLS
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous access" ON public.storage_objects;

-- Создаем новые политики
CREATE POLICY "Allow all operations for authenticated users" ON public.storage_objects
FOR ALL TO public
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

CREATE POLICY "Allow anonymous access" ON public.storage_objects
FOR ALL TO anon
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 5. Проверяем результат
SELECT 'Storage исправлен!' as status;
SELECT id, name, public FROM public.storage_buckets WHERE id IN ('documents', 'qualification-objects');






















