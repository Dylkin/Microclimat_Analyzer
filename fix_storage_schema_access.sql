-- SQL скрипт для исправления доступа к системным таблицам Supabase Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Проверяем существование таблиц storage
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE schemaname = 'storage' 
ORDER BY tablename;

-- 2. Проверяем права доступа к таблице public.storage_buckets
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'storage' 
  AND table_name = 'buckets';

-- 3. Предоставляем права на чтение таблицы public.storage_buckets для аутентифицированных пользователей
GRANT SELECT ON public.storage_buckets TO public;
GRANT SELECT ON public.storage_buckets TO anon;

-- 4. Предоставляем права на чтение таблицы public.storage_objects для аутентифицированных пользователей
GRANT SELECT ON public.storage_objects TO public;
GRANT SELECT ON public.storage_objects TO anon;

-- 5. Предоставляем права на запись в таблицу public.storage_objects для аутентифицированных пользователей
GRANT INSERT, UPDATE, DELETE ON public.storage_objects TO public;
GRANT INSERT, UPDATE, DELETE ON public.storage_objects TO anon;

-- 6. Создаем функцию для выполнения SQL (если не существует)
CREATE OR REPLACE FUNCTION public.exec(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'SQL executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- 7. Предоставляем права на выполнение функции exec
GRANT EXECUTE ON FUNCTION public.exec(text) TO public;
GRANT EXECUTE ON FUNCTION public.exec(text) TO anon;

-- 8. Проверяем, что buckets существуют и доступны
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM public.storage_buckets 
WHERE id IN ('qualification-objects', 'documents');

-- 9. Если buckets не существуют, создаем их
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualification-objects',
  'qualification-objects',
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
    'image/tiff',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
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
    'image/tiff',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm'
  ];

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

-- 10. Настраиваем политики RLS для public.storage_objects
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletions" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file downloads" ON public.storage_objects;
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

-- 11. Финальная проверка
SELECT 'Storage schema access исправлен успешно!' as message;
SELECT 
  id, 
  name, 
  public, 
  file_size_limit
FROM public.storage_buckets 
WHERE id IN ('qualification-objects', 'documents');






















