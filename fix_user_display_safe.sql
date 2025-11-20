-- Безопасное решение для исправления отображения ФИО пользователей
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем структуру таблицы auth.users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 2. Проверяем, существует ли таблица public.users
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 3. Создаем таблицу public.users если она не существует
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Включаем RLS для таблицы users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert any record" ON public.users;

-- 6. Создаем политику для чтения (все аутентифицированные пользователи могут читать)
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT TO public
  USING (true);

-- 7. Создаем политику для вставки (пользователи могут создавать свои записи)
CREATE POLICY "Users can insert their own record" ON public.users
  FOR INSERT TO public
  WITH CHECK (NULL = id);

-- 8. Создаем политику для обновления (пользователи могут обновлять свои записи)
CREATE POLICY "Users can update their own record" ON public.users
  FOR UPDATE TO public
  USING (NULL = id)
  WITH CHECK (NULL = id);

-- 9. Создаем политику для вставки любых записей (для административных целей)
CREATE POLICY "Users can insert any record" ON public.users
  FOR INSERT TO public
  WITH CHECK (true);

-- 10. Создаем безопасную функцию для добавления пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $func$
BEGIN
  -- Добавляем пользователя только если email подтвержден и не пустой
  IF NEW.email IS NOT NULL 
     AND NEW.email != '' 
     AND NEW.email_confirmed_at IS NOT NULL 
     AND NEW.id IS NOT NULL THEN
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

-- 11. Создаем триггер для автоматического добавления новых пользователей
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 12. Безопасное добавление существующих пользователей
-- Используем поэтапный подход для избежания ошибок
DO $block$
DECLARE
  user_record RECORD;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Перебираем всех пользователей из auth.users
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.email_confirmed_at,
      au.raw_user_meta_data
    FROM public.users au
    WHERE au.email IS NOT NULL 
      AND au.email != ''
      AND au.id IS NOT NULL
  LOOP
    BEGIN
      -- Проверяем, есть ли уже запись в public.users
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_record.id) THEN
        -- Добавляем пользователя только если email подтвержден
        IF user_record.email_confirmed_at IS NOT NULL THEN
          INSERT INTO public.users (id, email, full_name)
          VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email)
          );
          inserted_count := inserted_count + 1;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Ошибка при добавлении пользователя %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Добавлено пользователей: %, ошибок: %', inserted_count, error_count;
END $block$;

-- 13. Проверяем результат - показываем всех пользователей
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

-- 14. Показываем статистику
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name != email THEN 1 END) as users_with_full_name,
  COUNT(CASE WHEN full_name = email THEN 1 END) as users_needing_full_name
FROM public.users;
