-- Скрипт для добавления пользователя в таблицу users
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, есть ли пользователь с нужным ID
SELECT id, email, full_name, role 
FROM public.users 
WHERE id = '60d1399a-56be-4d32-a745-b95aab825ec3';

-- 2. Если пользователя нет, добавляем его
INSERT INTO public.users (id, email, full_name, role)
VALUES ('60d1399a-56be-4d32-a745-b95aab825ec3', 'pavel.dylkin@gmail.com', 'Павел Дылкин', 'specialist')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 3. Проверяем, что пользователь добавлен
SELECT id, email, full_name, role 
FROM public.users 
WHERE id = '60d1399a-56be-4d32-a745-b95aab825ec3';

-- 4. Проверяем все пользователей в таблице
SELECT id, email, full_name, role, created_at
FROM public.users
ORDER BY created_at DESC;




















