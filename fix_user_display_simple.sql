-- Простое решение для исправления отображения ФИО пользователей
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица users
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 2. Если таблица не существует, создаем её
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Включаем RLS для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Создаем политики для RLS (удаляем существующие если есть, затем создаем новые)
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

-- 5. Создаем политику для чтения (все аутентифицированные пользователи могут читать)
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT TO public
  USING (true);

-- 6. Создаем политику для вставки (пользователи могут создавать свои записи)
CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT TO public
  WITH CHECK (NULL = id);

-- 7. Создаем политику для обновления (пользователи могут обновлять свои записи)
CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE TO public
  USING (NULL = id)
  WITH CHECK (NULL = id);

-- 8. Добавляем текущего пользователя в таблицу users (замените на ваш email)
-- Получаем ID текущего пользователя
DO $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  -- Получаем ID и email текущего пользователя
  SELECT id, email INTO current_user_id, current_user_email
  FROM public.users 
  WHERE email = 'pavel.dylkin@gmail.com'  -- Замените на ваш email
  LIMIT 1;
  
  IF current_user_id IS NOT NULL THEN
    -- Вставляем или обновляем запись пользователя
    INSERT INTO public.users (id, email, full_name)
    VALUES (current_user_id, current_user_email, 'Павел Дылкин')  -- Замените на ваше ФИО
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();
    
    RAISE NOTICE 'Пользователь % добавлен/обновлен в таблицу users', current_user_email;
  ELSE
    RAISE NOTICE 'Пользователь с email pavel.dylkin@gmail.com не найден';
  END IF;
END $$;

-- 9. Проверяем результат
SELECT id, email, full_name, created_at, updated_at 
FROM public.users 
WHERE email = 'pavel.dylkin@gmail.com';  -- Замените на ваш email
