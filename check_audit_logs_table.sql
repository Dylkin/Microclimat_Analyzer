-- Проверка существования таблицы audit_logs
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'audit_logs';

-- Проверка структуры таблицы audit_logs (если существует)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Проверка RLS политик для таблицы audit_logs
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
AND tablename = 'audit_logs';

-- Проверка индексов для таблицы audit_logs
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- Попытка подсчета записей в таблице audit_logs
SELECT COUNT(*) as total_records FROM public.audit_logs;



















