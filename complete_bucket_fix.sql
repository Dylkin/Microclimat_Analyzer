-- Полное исправление проблемы "Bucket not found" для всех типов документов
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создаем все необходимые buckets для приложения
-- Bucket для документов проектов
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Публичный bucket
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Bucket для файлов объектов квалификации
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualification-objects',
  'qualification-objects',
  true,  -- Публичный bucket
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

-- Bucket для файлов оборудования
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-files',
  'equipment-files',
  true,  -- Публичный bucket
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

-- 2. Проверяем результат
SELECT 'All buckets created/updated successfully' as status;
SELECT id, name, public, file_size_limit FROM public.storage_buckets WHERE id IN ('documents', 'qualification-objects', 'equipment-files');

-- 3. Проверяем существующие политики (для публичных buckets они не нужны, но проверим)
SELECT 'Checking existing storage policies...' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
AND policyname LIKE '%documents%' OR policyname LIKE '%qualification%' OR policyname LIKE '%equipment%';

-- 4. Удаляем ненужные политики для публичных buckets (если они есть)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Public can view documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow authenticated users to access documents" ON public.storage_objects;

-- 5. Финальная проверка
SELECT 'Storage setup completed successfully!' as status;
SELECT 'You can now upload and view documents in the application.' as message;























