-- Быстрая проверка структуры БД
-- Выполнить в Supabase SQL Editor

-- 1. Какие таблицы существуют?
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. Есть ли project_id в qualification_objects?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'qualification_objects' AND column_name = 'project_id'
        ) 
        THEN 'ДА - есть project_id в qualification_objects' 
        ELSE 'НЕТ - нет project_id в qualification_objects' 
    END AS result;

-- 3. Есть ли таблица project_qualification_objects?
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_qualification_objects') 
        THEN 'ДА - есть таблица project_qualification_objects' 
        ELSE 'НЕТ - нет таблицы project_qualification_objects' 
    END AS result;

-- 4. Сколько записей в основных таблицах?
SELECT 'contractors' AS table_name, COUNT(*) AS count FROM contractors
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'qualification_objects', COUNT(*) FROM qualification_objects;















