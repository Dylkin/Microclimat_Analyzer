-- Упрощенное решение для исправления отображения ФИО пользователей
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица users
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 2. Создаем таблицу users если она не существует
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 8. Добавляем пользователя pavel.dylkin@gmail.com
-- Сначала найдем его ID
SELECT id, email FROM public.users WHERE email = 'pavel.dylkin@gmail.com';

-- 9. Вставляем запись пользователя (замените UUID на реальный ID из предыдущего запроса)
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

-- 10. Проверяем результат
SELECT id, email, full_name, created_at, updated_at 
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com';



















