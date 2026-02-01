-- Скрипт для создания RPC функции получения информации о пользователе
-- Выполнять в Supabase SQL Editor

-- Создаем функцию для получения информации о пользователе
CREATE OR REPLACE FUNCTION get_user_info(user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Сначала пробуем получить из public.users
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role::text
  FROM public.users u
  WHERE u.id = user_id;
  
  -- Если не найдено в public.users, пробуем получить из auth.users
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
      'specialist'::text as role
    FROM public.users au
    WHERE au.id = user_id;
  END IF;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION get_user_info(uuid) TO public;

-- Тестируем функцию
SELECT * FROM get_user_info('60d1399a-56be-4d32-a745-b95aab825ec3'::uuid);




















