-- Исправление проблемы с MIME-типами для файлов .vi2 в Supabase Storage
-- Упрощенная версия скрипта

-- 1. Обновляем политику bucket для разрешения MIME-типов
UPDATE public.storage_buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]), 
  ARRAY[
    'application/octet-stream',  -- Для .vi2 файлов
    'video/mp4',                -- Альтернативный тип для .vi2
    'video/x-msvideo',          -- Для AVI файлов
    'video/quicktime',          -- Для MOV файлов
    'video/x-ms-wmv',           -- Для WMV файлов
    'video/x-flv',              -- Для FLV файлов
    'video/webm',               -- Для WebM файлов
    'audio/mpeg',               -- Для MP3 файлов
    'audio/wav',                -- Для WAV файлов
    'audio/ogg',                -- Для OGG файлов
    'audio/aac',                -- Для AAC файлов
    'audio/flac',               -- Для FLAC файлов
    'text/csv',                 -- Для CSV файлов
    'application/vnd.ms-excel', -- Для XLS файлов
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' -- Для XLSX файлов
  ]
)
WHERE id IN ('qualification-objects', 'documents');

-- 2. Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Allow vi2 file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletion" ON public.storage_objects;

-- 3. Создаем политику для загрузки файлов
CREATE POLICY "Allow vi2 file uploads" ON public.storage_objects
FOR INSERT TO public
WITH CHECK (
  bucket_id IN ('qualification-objects', 'documents')
);

-- 4. Создаем политику для чтения файлов
CREATE POLICY "Allow file downloads" ON public.storage_objects
FOR SELECT TO public
USING (
  bucket_id IN ('qualification-objects', 'documents')
);

-- 5. Создаем политику для обновления файлов
CREATE POLICY "Allow file updates" ON public.storage_objects
FOR UPDATE TO public
USING (
  bucket_id IN ('qualification-objects', 'documents')
)
WITH CHECK (
  bucket_id IN ('qualification-objects', 'documents')
);

-- 6. Создаем политику для удаления файлов
CREATE POLICY "Allow file deletion" ON public.storage_objects
FOR DELETE TO public
USING (
  bucket_id IN ('qualification-objects', 'documents')
);

-- 7. Проверяем результат
SELECT 
  'Политики Storage обновлены для поддержки файлов .vi2' as message,
  COUNT(*) as total_buckets_updated
FROM public.storage_buckets 
WHERE id IN ('qualification-objects', 'documents');
