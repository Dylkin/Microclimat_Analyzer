-- ПРОВЕРКА ПОЛИТИК RLS
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Показываем все политики RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Показываем статус RLS для всех таблиц
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS включен'
        ELSE '❌ RLS отключен'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Показываем количество политик для каждой таблицы
SELECT 
    tablename,
    COUNT(*) as policy_count,
    rowsecurity as rls_enabled
FROM pg_policies p
RIGHT JOIN pg_tables t ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 4. Показываем таблицы без политик RLS (но с включенным RLS)
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    '⚠️ RLS включен, но нет политик!' as warning
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.tablename IS NULL
ORDER BY t.tablename;

-- 5. Показываем таблицы с отключенным RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    '❌ RLS отключен' as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;





















