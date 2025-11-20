-- Исправление ошибки "Bucket not found" для загруженных документов
-- Выполните эти команды в Supabase SQL Editor

-- 1. Проверяем существование bucket
SELECT 'Checking bucket existence...' as status;
SELECT * FROM public.storage_buckets WHERE id = 'documents';

-- 2. Создаем публичный bucket 'documents' (рекомендуемое решение)
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Публичный bucket - не требует RLS политик
  52428800, -- 50MB лимит
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 3. Проверяем результат
SELECT 'Bucket created/updated successfully' as status;
SELECT * FROM public.storage_buckets WHERE id = 'documents';

-- 4. Проверяем политики (должны быть не нужны для публичного bucket)
SELECT 'Checking storage policies...' as status;
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%documents%';







