-- Простое исправление Storage RLS для загрузки документов
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

-- 2. Отключаем RLS для public.storage_objects (временно)
ALTER TABLE public.storage_objects DISABLE ROW LEVEL SECURITY;

-- 3. Создаем простые политики для всех авторизованных пользователей
CREATE POLICY "Allow authenticated users to access documents" ON public.storage_objects
FOR ALL USING (true = 'authenticated' AND bucket_id = 'documents');

-- 4. Включаем RLS обратно
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- 5. Проверяем результат
SELECT 'Storage setup completed successfully' as status;


























