-- Скрипт для обновления роли пользователя на администратора
-- Выполнять в PostgreSQL (psql или клиенте БД)

-- 1. Проверяем структуру таблицы users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Если столбец role отсутствует, добавляем его
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 3. Добавляем комментарий к столбцу
COMMENT ON COLUMN public.users.role IS 'Роль пользователя: admin, specialist, user';

-- 4. Проверяем текущую роль пользователя
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 5. Обновляем роль пользователя на 'admin'
UPDATE public.users 
SET 
  role = 'admin',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- 6. Проверяем результат обновления
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at,
  u.updated_at
FROM public.users u
WHERE u.email = 'pavel.dylkin@gmail.com';

-- 7. Роль хранится в public.users (столбец role). Дополнительные таблицы auth.* не используются (проект на PostgreSQL).
