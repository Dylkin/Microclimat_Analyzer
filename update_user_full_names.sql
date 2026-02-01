-- Скрипт для ручного обновления ФИО пользователей
-- Выполнять в Supabase SQL Editor

-- 1. Показываем всех пользователей, которым нужно обновить ФИО
SELECT 
  id,
  email,
  full_name,
  CASE 
    WHEN full_name = email THEN 'Требует обновления'
    ELSE 'ФИО настроено'
  END as status
FROM public.users
ORDER BY created_at DESC;

-- 2. Примеры обновления ФИО для конкретных пользователей
-- Замените email и full_name на реальные данные

-- Обновление ФИО для пользователя pavel.dylkin@gmail.com
UPDATE public.users 
SET 
  full_name = 'Павел Дылкин',
  updated_at = now()
WHERE email = 'pavel.dylkin@gmail.com';

-- Добавьте здесь другие пользователи по необходимости:
-- UPDATE public.users 
-- SET 
--   full_name = 'Имя Фамилия',
--   updated_at = now()
-- WHERE email = 'user@example.com';

-- 3. Проверяем результат обновления
SELECT 
  id,
  email,
  full_name,
  updated_at
FROM public.users
WHERE email = 'pavel.dylkin@gmail.com';

-- 4. Показываем финальную статистику
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN full_name != email THEN 1 END) as users_with_full_name,
  COUNT(CASE WHEN full_name = email THEN 1 END) as users_needing_full_name
FROM public.users;



















