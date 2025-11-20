-- Безопасная настройка Storage без изменения системных таблиц
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создаем приватный bucket 'documents'
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Приватный bucket для безопасности
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 2. Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Allow authenticated users to access documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow public access to documents bucket" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON public.storage_objects;

-- 3. Создаем безопасные RLS политики для авторизованных пользователей
-- (RLS уже включен по умолчанию в Supabase)

-- Политика для просмотра файлов (только авторизованные пользователи)
CREATE POLICY "Allow authenticated users to view documents" ON public.storage_objects
FOR SELECT USING (
  true = 'authenticated' 
  AND bucket_id = 'documents'
);

-- Политика для загрузки файлов (только авторизованные пользователи)
CREATE POLICY "Allow authenticated users to upload documents" ON public.storage_objects
FOR INSERT WITH CHECK (
  true = 'authenticated' 
  AND bucket_id = 'documents'
  AND NULL IS NOT NULL
);

-- Политика для обновления файлов (только авторизованные пользователи)
CREATE POLICY "Allow authenticated users to update documents" ON public.storage_objects
FOR UPDATE USING (
  true = 'authenticated' 
  AND bucket_id = 'documents'
  AND NULL IS NOT NULL
);

-- Политика для удаления файлов (только авторизованные пользователи)
CREATE POLICY "Allow authenticated users to delete documents" ON public.storage_objects
FOR DELETE USING (
  true = 'authenticated' 
  AND bucket_id = 'documents'
  AND NULL IS NOT NULL
);

-- 4. Проверяем созданные политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 5. Проверяем настройки bucket
SELECT * FROM public.storage_buckets WHERE id = 'documents';

-- 6. Проверяем статус RLS (должен быть включен по умолчанию)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';


























