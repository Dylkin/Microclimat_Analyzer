-- Включение анонимной аутентификации в Supabase
-- Выполните эти команды в Supabase SQL Editor

-- 1. Включаем анонимную аутентификацию
UPDATE public.config 
SET enable_anonymous_sign_ins = true;

-- 2. Проверяем настройки
SELECT * FROM public.config;

-- 3. Альтернативный способ - создаем политику для неаутентифицированных пользователей
-- (если анонимная аутентификация не работает)

-- Создаем политику для публичного доступа к Storage
CREATE POLICY "Allow public access to documents bucket" ON public.storage_objects
FOR ALL USING (bucket_id = 'documents');

-- Проверяем созданные политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';


























