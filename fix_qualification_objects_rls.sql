-- Исправление политик RLS для bucket qualification-objects
-- Этот скрипт создает политики для загрузки файлов планов объектов квалификации

-- Сначала удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow public uploads to qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow public downloads from qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from qualification-objects" ON public.storage_objects;

-- Создаем политики для публичного доступа (временное решение)
-- ВНИМАНИЕ: Это позволяет любому пользователю загружать и скачивать файлы
-- Для продакшена рекомендуется использовать аутентификацию

-- Политика для загрузки файлов (INSERT)
CREATE POLICY "Allow public uploads to qualification-objects" ON public.storage_objects
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'qualification-objects');

-- Политика для скачивания файлов (SELECT)
CREATE POLICY "Allow public downloads from qualification-objects" ON public.storage_objects
FOR SELECT 
TO public
USING (bucket_id = 'qualification-objects');

-- Политика для обновления файлов (UPDATE)
CREATE POLICY "Allow public updates to qualification-objects" ON public.storage_objects
FOR UPDATE 
TO public
USING (bucket_id = 'qualification-objects')
WITH CHECK (bucket_id = 'qualification-objects');

-- Политика для удаления файлов (DELETE)
CREATE POLICY "Allow public deletes from qualification-objects" ON public.storage_objects
FOR DELETE 
TO public
USING (bucket_id = 'qualification-objects');

-- Проверяем, что bucket существует и RLS включен
SELECT 
    name as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types
FROM public.storage_buckets 
WHERE name = 'qualification-objects';

-- Проверяем созданные политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%qualification-objects%';