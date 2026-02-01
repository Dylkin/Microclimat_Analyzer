-- Скрипт для проверки доступа пользователя и диагностики проблемы
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем структуру таблицы users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем данные пользователя в public.users
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 3. Проверяем данные пользователя в auth.users
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.raw_user_meta_data,
  au.created_at,
  au.updated_at
FROM public.users au
WHERE au.email = 'pavel.dylkin@gmail.com';

-- 4. Проверяем, есть ли пользователь в обеих таблицах
SELECT 
  'public.users' as table_name,
  COUNT(*) as count
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com'
UNION ALL
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com';

-- 5. Если пользователь отсутствует в public.users, добавляем его
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'admin') as role
FROM public.users au
WHERE au.email = 'pavel.dylkin@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu 
    WHERE pu.id = au.id
  );

-- 6. Обновляем роль пользователя на 'admin' в public.users
UPDATE public.users 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 7. Обновляем роль в auth.users (user_metadata)
UPDATE auth.users 
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 8. Финальная проверка - показываем все данные пользователя
SELECT 
  'public.users' as source,
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com'
UNION ALL
SELECT 
  'auth.users' as source,
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'role' as role,
  au.updated_at
FROM public.users au
WHERE au.email = 'pavel.dylkin@gmail.com';



















