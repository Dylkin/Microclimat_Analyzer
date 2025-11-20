-- Проверка структуры всех таблиц в базе данных
-- Выполнить в Supabase SQL Editor

-- 1. Список всех таблиц
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Структура каждой таблицы
DO $$
DECLARE
    table_name text;
    column_info record;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        RAISE NOTICE '=== Таблица: % ===', table_name;
        
        FOR column_info IN
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = table_name 
              AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % (nullable: %, default: %)', 
                column_info.column_name, 
                column_info.data_type,
                column_info.is_nullable,
                column_info.column_default;
        END LOOP;
        
        RAISE NOTICE '';
    END LOOP;
END $$;

-- 3. Количество записей в каждой таблице
DO $$
DECLARE
    table_name text;
    row_count integer;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(table_name) INTO row_count;
        RAISE NOTICE 'Таблица %: % записей', table_name, row_count;
    END LOOP;
END $$;










