-- Упрощенное решение для исправления отображения ФИО пользователей
-- Выполнять в Supabase SQL Editor (без сложных конструкций)

-- 1. Проверяем, существует ли таблица public.users
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 2. Создаем таблицу public.users если она не существует
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Включаем RLS для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert any record" ON public.users;

-- 5. Создаем политику для чтения
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT TO public
  USING (true);

-- 6. Создаем политику для вставки
CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT TO public
  WITH CHECK (NULL = id);

-- 7. Создаем политику для обновления
CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE TO public
  USING (NULL = id)
  WITH CHECK (NULL = id);

-- 8. Создаем политику для вставки любых записей
CREATE POLICY "Users can insert any record" ON public.users
  FOR INSERT TO public
  WITH CHECK (true);

-- 9. Показываем всех пользователей из auth.users для ручного добавления
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

-- 10. Ручное добавление пользователей (выполните для каждого пользователя)
-- Замените UUID и данные на реальные из предыдущего запроса

-- Пример для пользователя pavel.dylkin@gmail.com:
INSERT INTO public.users (id, email, full_name)
VALUES (
  '60d1399a-56be-4d32-a745-b95aab825ec3',  -- Замените на реальный UUID
  'pavel.dylkin@gmail.com',
  'Павел Дылкин'
)
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Добавьте здесь других пользователей по необходимости:
-- INSERT INTO public.users (id, email, full_name)
-- VALUES (
--   'user-uuid-here',
--   'user@example.com',
--   'Имя Фамилия'
-- )
-- ON CONFLICT (id) 
-- DO UPDATE SET 
--   email = EXCLUDED.email,
--   full_name = EXCLUDED.full_name,
--   updated_at = now();

-- 11. Проверяем результат
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

-- 12. Показываем статистику
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name != email THEN 1 END) as users_with_full_name,
  COUNT(CASE WHEN full_name = email THEN 1 END) as users_needing_full_name
FROM public.users;
