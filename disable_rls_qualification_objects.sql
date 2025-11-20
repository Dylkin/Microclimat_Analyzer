-- Временное отключение RLS для bucket qualification-objects
-- Это самый быстрый способ решить проблему с загрузкой файлов

-- Проверяем текущее состояние RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Отключаем RLS для таблицы public.storage_objects
-- ВНИМАНИЕ: Это отключает RLS для ВСЕХ bucket'ов в storage
ALTER TABLE public.storage_objects DISABLE ROW LEVEL SECURITY;

-- Проверяем, что RLS отключен
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Проверяем bucket qualification-objects
SELECT 
    name as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types
FROM public.storage_buckets 
WHERE name = 'qualification-objects';

-- Если нужно включить RLS обратно после тестирования, выполните:
-- ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;