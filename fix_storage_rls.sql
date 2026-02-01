-- Исправление RLS политик для Storage bucket 'documents'
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создаем bucket 'documents' если он не существует
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- приватный bucket
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Отключаем RLS для bucket (временно для тестирования)
ALTER TABLE public.storage_objects DISABLE ROW LEVEL SECURITY;

-- 3. Создаем политики для чтения документов (всем авторизованным пользователям)
CREATE POLICY "Allow authenticated users to view documents" ON public.storage_objects
FOR SELECT USING (true = 'authenticated' AND bucket_id = 'documents');

-- 4. Создаем политики для загрузки документов (всем авторизованным пользователям)
CREATE POLICY "Allow authenticated users to upload documents" ON public.storage_objects
FOR INSERT WITH CHECK (true = 'authenticated' AND bucket_id = 'documents');

-- 5. Создаем политики для обновления документов (всем авторизованным пользователям)
CREATE POLICY "Allow authenticated users to update documents" ON public.storage_objects
FOR UPDATE USING (true = 'authenticated' AND bucket_id = 'documents');

-- 6. Создаем политики для удаления документов (всем авторизованным пользователям)
CREATE POLICY "Allow authenticated users to delete documents" ON public.storage_objects
FOR DELETE USING (true = 'authenticated' AND bucket_id = 'documents');

-- 7. Включаем RLS обратно
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- 8. Проверяем созданные политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';


























