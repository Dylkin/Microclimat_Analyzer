/*
  # Создание пользователя по умолчанию

  1. Создание пользователя
    - ФИО: Дылкин П.А.
    - Email: pavel.dylkin@gmail.com
    - Пароль: 00016346
    - Роль: Администратор

  2. Примечания
    - Пользователь будет создан в auth.users через Supabase Auth
    - Профиль будет добавлен в таблицу users
*/

-- Функция для создания пользователя по умолчанию
CREATE OR REPLACE FUNCTION create_default_user()
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Проверяем, существует ли уже пользователь с таким email
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'pavel.dylkin@gmail.com') THEN
    -- Создаем запись в auth.users (это будет сделано через приложение)
    -- Здесь мы создаем только профиль пользователя
    
    -- Генерируем UUID для пользователя по умолчанию
    user_id := gen_random_uuid();
    
    -- Вставляем профиль пользователя
    INSERT INTO users (id, email, full_name, role, created_at, updated_at)
    VALUES (
      user_id,
      'pavel.dylkin@gmail.com',
      'Дылкин П.А.',
      'administrator',
      now(),
      now()
    );
    
    RAISE NOTICE 'Пользователь по умолчанию создан: pavel.dylkin@gmail.com';
  ELSE
    RAISE NOTICE 'Пользователь по умолчанию уже существует';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Вызываем функцию создания пользователя по умолчанию
-- SELECT create_default_user();

-- Примечание: Фактическое создание пользователя в auth.users 
-- должно быть выполнено через Supabase Auth API в приложении