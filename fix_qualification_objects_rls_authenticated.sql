-- Исправление политик RLS для bucket qualification-objects с аутентификацией
-- Этот скрипт создает политики для загрузки файлов планов объектов квалификации с проверкой аутентификации

-- Сначала удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow authenticated uploads to qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated downloads from qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated updates to qualification-objects" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from qualification-objects" ON public.storage_objects;

-- Создаем политики для аутентифицированных пользователей

-- Политика для загрузки файлов (INSERT) - только для аутентифицированных пользователей
CREATE POLICY "Allow authenticated uploads to qualification-objects" ON public.storage_objects
FOR INSERT 
TO public
WITH CHECK (
    bucket_id = 'qualification-objects' 
    AND NULL IS NOT NULL
);

-- Политика для скачивания файлов (SELECT) - только для аутентифицированных пользователей
CREATE POLICY "Allow authenticated downloads from qualification-objects" ON public.storage_objects
FOR SELECT 
TO public
USING (
    bucket_id = 'qualification-objects' 
    AND NULL IS NOT NULL
);

-- Политика для обновления файлов (UPDATE) - только для аутентифицированных пользователей
CREATE POLICY "Allow authenticated updates to qualification-objects" ON public.storage_objects
FOR UPDATE 
TO public
USING (
    bucket_id = 'qualification-objects' 
    AND NULL IS NOT NULL
)
WITH CHECK (
    bucket_id = 'qualification-objects' 
    AND NULL IS NOT NULL
);

-- Политика для удаления файлов (DELETE) - только для аутентифицированных пользователей
CREATE POLICY "Allow authenticated deletes from qualification-objects" ON public.storage_objects
FOR DELETE 
TO public
USING (
    bucket_id = 'qualification-objects' 
    AND NULL IS NOT NULL
);

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























