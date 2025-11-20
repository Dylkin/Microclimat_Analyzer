-- Альтернативное решение для Storage RLS без изменения системных таблиц
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создаем bucket 'documents' если он не существует
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Allow authenticated users to access documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON public.storage_objects;

-- 3. Создаем разрешающую политику для всех операций
CREATE POLICY "Allow authenticated users to access documents" ON public.storage_objects
FOR ALL USING (true = 'authenticated' AND bucket_id = 'documents');

-- 4. Проверяем результат
SELECT 'Storage setup completed successfully' as status;
SELECT * FROM public.storage_buckets WHERE id = 'documents';


























