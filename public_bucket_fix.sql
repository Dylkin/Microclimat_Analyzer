-- Простое решение: создание публичного bucket для документов
-- Выполните эти команды в Supabase SQL Editor

-- 1. Создаем публичный bucket 'documents'
INSERT INTO public.storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Публичный bucket - не требует RLS политик
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 2. Проверяем результат
SELECT 'Public bucket created successfully' as status;
SELECT * FROM public.storage_buckets WHERE id = 'documents';


























