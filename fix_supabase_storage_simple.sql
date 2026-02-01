-- Упрощенный SQL скрипт для настройки Supabase Storage
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Обновляем существующий bucket для объектов квалификации
UPDATE public.storage_buckets 
SET public = true
WHERE id = 'qualification-objects';

-- 2. Создаем bucket для документов
INSERT INTO public.storage_buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Удаляем все старые политики
DROP POLICY IF EXISTS "Allow file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file downloads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file updates" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow file deletions" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file uploads" ON public.storage_objects;
DROP POLICY IF EXISTS "Allow anonymous file downloads" ON public.storage_objects;

-- 4. Создаем простые политики для всех операций
CREATE POLICY "Allow all operations for authenticated users" ON public.storage_objects
FOR ALL TO public
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 5. Создаем политики для анонимного доступа
CREATE POLICY "Allow anonymous access" ON public.storage_objects
FOR ALL TO anon
USING (bucket_id IN ('qualification-objects', 'documents'))
WITH CHECK (bucket_id IN ('qualification-objects', 'documents'));

-- 6. Включаем RLS
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

-- 7. Проверяем результат
SELECT 'Storage настроен успешно!' as message;
