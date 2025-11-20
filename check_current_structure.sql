-- Скрипт для проверки текущей структуры базы данных
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

-- 4. Проверка внешних ключей
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name IN ('qualification_objects', 'projects', 'project_qualification_objects')
         OR ccu.table_name IN ('qualification_objects', 'projects'))
ORDER BY tc.table_name, kcu.column_name;

-- 5. Проверка индексов
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('qualification_objects', 'projects', 'project_qualification_objects')
ORDER BY tablename, indexname;

-- 6. Проверка количества записей
SELECT
    'qualification_objects' AS table_name,
    COUNT(*) AS row_count
FROM qualification_objects
UNION ALL
SELECT
    'projects' AS table_name,
    COUNT(*) AS row_count
FROM projects
UNION ALL
SELECT
    'project_qualification_objects' AS table_name,
    COUNT(*) AS row_count
FROM project_qualification_objects
UNION ALL
SELECT
    'contractors' AS table_name,
    COUNT(*) AS row_count
FROM contractors;

-- 7. Проверка связей между проектами и объектами
-- Если есть project_qualification_objects
SELECT 
    'project_qualification_objects' AS relationship_type,
    COUNT(*) AS total_links,
    COUNT(DISTINCT project_id) AS unique_projects,
    COUNT(DISTINCT qualification_object_id) AS unique_objects
FROM project_qualification_objects;

-- Если есть project_id в qualification_objects
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' AND column_name = 'project_id'
    ) THEN
        EXECUTE '
        SELECT 
            ''qualification_objects.project_id'' AS relationship_type,
            COUNT(*) AS total_objects,
            COUNT(DISTINCT project_id) AS unique_projects,
            COUNT(*) AS total_objects
        FROM qualification_objects';
    ELSE
        RAISE NOTICE 'Колонка project_id не существует в qualification_objects';
    END IF;
END $$;

-- 8. Проверка "висячих" ссылок
-- Проверяем projects.contractor_id
SELECT 
    'projects.contractor_id' AS check_type,
    COUNT(*) AS orphaned_count
FROM projects p
LEFT JOIN contractors c ON p.contractor_id = c.id
WHERE c.id IS NULL;

-- Проверяем qualification_objects.project_id (если существует)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' AND column_name = 'project_id'
    ) THEN
        EXECUTE '
        SELECT 
            ''qualification_objects.project_id'' AS check_type,
            COUNT(*) AS orphaned_count
        FROM qualification_objects qo
        LEFT JOIN projects p ON qo.project_id = p.id
        WHERE p.id IS NULL';
    ELSE
        RAISE NOTICE 'Колонка project_id не существует в qualification_objects - пропускаем проверку';
    END IF;
END $$;

-- Проверяем project_qualification_objects
SELECT 
    'project_qualification_objects.project_id' AS check_type,
    COUNT(*) AS orphaned_count
FROM project_qualification_objects pqo
LEFT JOIN projects p ON pqo.project_id = p.id
WHERE p.id IS NULL;

SELECT 
    'project_qualification_objects.qualification_object_id' AS check_type,
    COUNT(*) AS orphaned_count
FROM project_qualification_objects pqo
LEFT JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
WHERE qo.id IS NULL;

-- 9. Проверка qualification_stages
SELECT 
    'qualification_stages.object_id' AS check_type,
    COUNT(*) AS orphaned_count
FROM qualification_stages qs
LEFT JOIN qualification_objects qo ON qs.object_id = qo.id
WHERE qo.id IS NULL;
