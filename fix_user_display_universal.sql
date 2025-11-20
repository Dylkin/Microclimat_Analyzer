-- Универсальное решение для исправления отображения ФИО всех пользователей
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица users
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 2. Создаем таблицу users если она не существует
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

-- 8. Создаем политику для вставки любых записей (для административных целей)
CREATE POLICY "Users can insert any record" ON public.users
  FOR INSERT TO public
  WITH CHECK (true);

-- 9. Создаем функцию для автоматического добавления пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $func$
BEGIN
  -- Добавляем пользователя только если email подтвержден
  IF NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Создаем триггер для автоматического добавления новых пользователей
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. Добавляем всех существующих пользователей из auth.users в public.users
-- Используем безопасный подход с проверкой существования пользователей
INSERT INTO public.users (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name
FROM public.users au
WHERE au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
  AND au.email IS NOT NULL
  AND au.email_confirmed_at IS NOT NULL  -- Только подтвержденные пользователи
ON CONFLICT (id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
  updated_at = now();

-- 12. Проверяем результат - показываем всех пользователей
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

-- 13. Показываем статистику
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name != email THEN 1 END) as users_with_full_name,
  COUNT(CASE WHEN full_name = email THEN 1 END) as users_needing_full_name
FROM public.users;
