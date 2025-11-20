-- Скрипт для исправления структуры таблицы public.users
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем текущую структуру таблицы users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем, есть ли столбец role
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public' 
  AND column_name = 'role';

-- 3. Если столбец role отсутствует, добавляем его
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 4. Добавляем комментарий к столбцу
COMMENT ON COLUMN public.users.role IS 'Роль пользователя: admin, specialist, user';

-- 5. Проверяем структуру таблицы после изменений
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Обновляем роль пользователя на 'admin'
UPDATE public.users 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 7. Проверяем результат обновления
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 8. Также обновляем роль в auth.users (user_metadata)
UPDATE auth.users 
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 9. Проверяем обновление в auth.users
SELECT 
  id,
  email,
  raw_user_meta_data,
  updated_at
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com';



















