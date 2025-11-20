-- Скрипт для проверки и исправления таблицы users
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица users
SELECT 
    table_name, 
    table_schema,
    is_insertable_into,
    is_typed
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

-- 2. Проверяем структуру таблицы users
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Проверяем RLS статус
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. Проверяем политики RLS
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 5. Проверяем, есть ли данные в таблице
SELECT COUNT(*) as user_count FROM public.users;

-- 6. Проверяем, есть ли пользователь с нужным ID
SELECT id, email, full_name, role 
FROM public.users 
WHERE id = '60d1399a-56be-4d32-a745-b95aab825ec3';

-- 7. Если таблица пустая, создаем тестового пользователя
-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES ('60d1399a-56be-4d32-a745-b95aab825ec3', 'pavel.dylkin@gmail.com', 'Павел Дылкин', 'specialist')
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   full_name = EXCLUDED.full_name,
--   role = EXCLUDED.role;

-- 8. Проверяем права доступа для текущего пользователя
SELECT 
    grantee, 
    privilege_type, 
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users' AND table_schema = 'public';




















