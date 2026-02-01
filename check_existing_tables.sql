-- ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ
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
  AND tablename LIKE '%project%' 
     OR tablename LIKE '%contractor%'
     OR tablename LIKE '%qualification%'
     OR tablename LIKE '%document%'
     OR tablename LIKE '%testing%'
     OR tablename LIKE '%logger%'
     OR tablename LIKE '%upload%'
     OR tablename LIKE '%approval%'
     OR tablename LIKE '%comment%'
     OR tablename LIKE '%schedule%'
ORDER BY tablename;

-- 3. Показываем все последовательности (sequences)
SELECT 
    schemaname,
    sequencename,
    sequenceowner
FROM pg_sequences 
WHERE schemaname = 'public'
ORDER BY sequencename;

-- 4. Показываем все индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename LIKE '%project%' 
     OR tablename LIKE '%contractor%'
     OR tablename LIKE '%qualification%'
     OR tablename LIKE '%document%'
     OR tablename LIKE '%testing%'
     OR tablename LIKE '%logger%'
     OR tablename LIKE '%upload%'
     OR tablename LIKE '%approval%'
     OR tablename LIKE '%comment%'
     OR tablename LIKE '%schedule%'
ORDER BY tablename, indexname;





















