-- Скрипт для исправления проблемы с внешним ключом в таблице public.users
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем текущую структуру таблицы public.users
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем внешние ключи для таблицы public.users
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'users'
  AND tc.table_schema = 'public';

-- 3. Удаляем таблицу public.users если она существует (с внешним ключом)
DROP TABLE IF EXISTS public.users CASCADE;

-- 4. Создаем таблицу public.users заново БЕЗ внешнего ключа
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Включаем RLS для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Создаем политики для RLS
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert any record" ON public.users;

CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT TO public
  WITH CHECK (NULL = id);

CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE TO public
  USING (NULL = id)
  WITH CHECK (NULL = id);

CREATE POLICY "Users can insert any record" ON public.users
  FOR INSERT TO public
  WITH CHECK (true);

-- 7. Показываем всех пользователей из auth.users для ручного добавления
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as suggested_full_name,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN 'Подтвержден'
    ELSE 'Не подтвержден'
  END as status
FROM public.users au
WHERE au.email IS NOT NULL 
  AND au.email != ''
  AND au.id IS NOT NULL
ORDER BY au.created_at DESC;

-- 8. Добавляем пользователя pavel.dylkin@gmail.com
INSERT INTO public.users (id, email, full_name)
VALUES (
  '60d1399a-56be-4d32-a745-b95aab825ec3',
  'pavel.dylkin@gmail.com',
  'Павел Дылкин'
)
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- 9. Проверяем результат
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at,
  u.updated_at,
  CASE 
    WHEN u.full_name = u.email THEN 'Требует настройки ФИО'
    ELSE 'ФИО настроено'
  END as status
FROM public.users u
ORDER BY u.created_at DESC;

-- 10. Показываем статистику
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name != email THEN 1 END) as users_with_full_name,
  COUNT(CASE WHEN full_name = email THEN 1 END) as users_needing_full_name
FROM public.users;



















