-- ПРОСТАЯ ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Показываем все таблицы в схеме public
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Показываем только таблицы, которые могут быть связаны с нашим проектом
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND (tablename LIKE '%project%' 
       OR tablename LIKE '%contractor%'
       OR tablename LIKE '%qualification%'
       OR tablename LIKE '%document%'
       OR tablename LIKE '%testing%'
       OR tablename LIKE '%logger%'
       OR tablename LIKE '%upload%'
       OR tablename LIKE '%approval%'
       OR tablename LIKE '%comment%'
       OR tablename LIKE '%schedule%')
ORDER BY tablename;

-- 3. Проверяем конкретные таблицы
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') 
        THEN 'projects - СУЩЕСТВУЕТ'
        ELSE 'projects - НЕ СУЩЕСТВУЕТ'
    END as projects_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') 
        THEN 'contractors - СУЩЕСТВУЕТ'
        ELSE 'contractors - НЕ СУЩЕСТВУЕТ'
    END as contractors_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_objects') 
        THEN 'qualification_objects - СУЩЕСТВУЕТ'
        ELSE 'qualification_objects - НЕ СУЩЕСТВУЕТ'
    END as qualification_objects_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_object_testing_periods') 
        THEN 'qualification_object_testing_periods - СУЩЕСТВУЕТ'
        ELSE 'qualification_object_testing_periods - НЕ СУЩЕСТВУЕТ'
    END as testing_periods_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testing_period_documents') 
        THEN 'testing_period_documents - СУЩЕСТВУЕТ'
        ELSE 'testing_period_documents - НЕ СУЩЕСТВУЕТ'
    END as testing_documents_status;





















