-- НАСТРОЙКА RLS ДЛЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Сначала проверим, какие таблицы существуют
DO $$
DECLARE
    table_name text;
    tables_to_check text[] := ARRAY[
        'projects', 'contractors', 'qualification_objects', 
        'project_qualification_objects', 'qualification_protocols',
        'project_documents', 'document_approvals', 'document_comments',
        'testing_periods', 'qualification_work_schedule', 
        'uploaded_files', 'logger_data', 'logger_data_summary'
    ];
    existing_tables text[] := ARRAY[]::text[];
BEGIN
    -- Проверяем, какие таблицы существуют
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            existing_tables := array_append(existing_tables, table_name);
            RAISE NOTICE 'Таблица % существует', table_name;
        ELSE
            RAISE NOTICE 'Таблица % НЕ существует', table_name;
        END IF;
    END LOOP;
    
    -- Выводим список существующих таблиц
    RAISE NOTICE 'Существующие таблицы: %', array_to_string(existing_tables, ', ');
END $$;

-- 2. Включаем RLS только для существующих таблиц
-- Projects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы projects';
    END IF;
END $$;

-- Contractors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') THEN
        ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы contractors';
    END IF;
END $$;

-- Qualification objects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_objects') THEN
        ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы qualification_objects';
    END IF;
END $$;

-- Project qualification objects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_qualification_objects') THEN
        ALTER TABLE project_qualification_objects ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы project_qualification_objects';
    END IF;
END $$;

-- Qualification protocols
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_protocols') THEN
        ALTER TABLE qualification_protocols ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы qualification_protocols';
    END IF;
END $$;

-- Project documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_documents') THEN
        ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы project_documents';
    END IF;
END $$;

-- Document approvals
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_approvals') THEN
        ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы document_approvals';
    END IF;
END $$;

-- Document comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_comments') THEN
        ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы document_comments';
    END IF;
END $$;

-- Testing periods (проверяем существование)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testing_periods') THEN
        ALTER TABLE testing_periods ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы testing_periods';
    ELSE
        RAISE NOTICE 'Таблица testing_periods не существует, пропускаем';
    END IF;
END $$;

-- Qualification work schedule
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_work_schedule') THEN
        ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы qualification_work_schedule';
    END IF;
END $$;

-- Uploaded files
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uploaded_files') THEN
        ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы uploaded_files';
    END IF;
END $$;

-- Logger data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logger_data') THEN
        ALTER TABLE logger_data ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы logger_data';
    END IF;
END $$;

-- Logger data summary
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logger_data_summary') THEN
        ALTER TABLE logger_data_summary ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для таблицы logger_data_summary';
    END IF;
END $$;

-- 3. Создаем политики только для существующих таблиц
-- Функция для создания политик
DO $$
DECLARE
    table_name text;
    tables_to_check text[] := ARRAY[
        'projects', 'contractors', 'qualification_objects', 
        'project_qualification_objects', 'qualification_protocols',
        'project_documents', 'document_approvals', 'document_comments',
        'testing_periods', 'qualification_work_schedule', 
        'uploaded_files', 'logger_data', 'logger_data_summary'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        -- Проверяем существование таблицы
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            -- Удаляем старые политики
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for users based on user_id" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON %I', table_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for anon users" ON %I', table_name);
            
            -- Создаем новые политики
            EXECUTE format('CREATE POLICY "%s_select_policy" ON %I FOR SELECT TO public USING (true)', table_name, table_name);
            EXECUTE format('CREATE POLICY "%s_insert_policy" ON %I FOR INSERT TO public WITH CHECK (true)', table_name, table_name);
            EXECUTE format('CREATE POLICY "%s_update_policy" ON %I FOR UPDATE TO public USING (true) WITH CHECK (true)', table_name, table_name);
            EXECUTE format('CREATE POLICY "%s_delete_policy" ON %I FOR DELETE TO public USING (true)', table_name, table_name);
            
            RAISE NOTICE 'Политики созданы для таблицы %', table_name;
        ELSE
            RAISE NOTICE 'Таблица % не существует, пропускаем создание политик', table_name;
        END IF;
    END LOOP;
END $$;

-- 4. Проверяем результат
SELECT 'Настройка RLS завершена!' as status;

-- 5. Показываем статус RLS для всех таблиц
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'projects', 'contractors', 'qualification_objects', 
    'project_qualification_objects', 'qualification_protocols',
    'project_documents', 'document_approvals', 'document_comments',
    'testing_periods', 'qualification_work_schedule', 
    'uploaded_files', 'logger_data', 'logger_data_summary'
  )
ORDER BY tablename;

-- 6. Показываем созданные политики
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;





















