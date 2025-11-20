-- Простой диагностический скрипт для проверки структуры БД
-- Выполнить в Supabase SQL Editor

-- 1. Проверка существования таблиц
SELECT 
    'Tables' AS category,
    tablename AS name,
    'EXISTS' AS status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Проверка колонок в qualification_objects
SELECT 
    'qualification_objects columns' AS category,
    column_name AS name,
    data_type AS type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'qualification_objects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Проверка колонок в projects
SELECT 
    'projects columns' AS category,
    column_name AS name,
    data_type AS type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Проверка существования project_qualification_objects
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_qualification_objects') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END AS project_qualification_objects_status;

-- 5. Проверка существования project_id в qualification_objects
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'qualification_objects' AND column_name = 'project_id'
        ) 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END AS project_id_in_qualification_objects_status;

-- 6. Проверка количества записей в основных таблицах
SELECT 'contractors' AS table_name, COUNT(*) AS row_count FROM contractors
UNION ALL
SELECT 'projects' AS table_name, COUNT(*) AS row_count FROM projects
UNION ALL
SELECT 'qualification_objects' AS table_name, COUNT(*) AS row_count FROM qualification_objects
UNION ALL
SELECT 'qualification_stages' AS table_name, COUNT(*) AS row_count FROM qualification_stages;

-- 7. Проверка количества записей в связующих таблицах (если существуют)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_qualification_objects') 
        THEN (SELECT 'project_qualification_objects' AS table_name, COUNT(*) AS row_count FROM project_qualification_objects)
        ELSE ('project_qualification_objects' AS table_name, 0 AS row_count)
    END;

-- 8. Проверка внешних ключей
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('qualification_objects', 'projects', 'project_qualification_objects')
ORDER BY tc.table_name, kcu.column_name;















