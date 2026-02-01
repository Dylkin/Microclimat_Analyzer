-- Скрипт для создания пользователя в Supabase Auth
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, существует ли пользователь в auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com';

-- 2. Если пользователь не существует, создаем его
-- ВНИМАНИЕ: Этот скрипт только показывает структуру, 
-- реальное создание пользователя должно происходить через Supabase Dashboard или API

-- Для создания пользователя используйте один из способов:

-- Способ 1: Через Supabase Dashboard
-- 1. Перейдите в Authentication > Users
-- 2. Нажмите "Add user"
-- 3. Заполните поля:
--    - Email: pavel.dylkin@gmail.com
--    - Password: 00016346
--    - Email Confirm: true
--    - User Metadata: {"full_name": "Павел Дылкин", "role": "specialist"}

-- Способ 2: Через API (выполнить в приложении)
-- const { data, error } = await supabase.auth.signUp({
--   email: 'pavel.dylkin@gmail.com',
--   password: '00016346',
--   options: {
--     data: {
--       full_name: 'Павел Дылкин',
--       role: 'specialist'
--     }
--   }
-- });

-- 3. После создания пользователя в auth.users, добавляем его в public.users
INSERT INTO public.users (id, email, full_name)
VALUES (
  (SELECT id FROM public.users WHERE email = 'pavel.dylkin@gmail.com' LIMIT 1),
  'pavel.dylkin@gmail.com',
  'Павел Дылкин'
)
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- 4. Проверяем результат
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';



















