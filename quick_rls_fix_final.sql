-- БЫСТРОЕ ИСПРАВЛЕНИЕ RLS (исправленная версия)
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Включаем RLS для существующих таблиц (проверяем каждую отдельно)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data_summary ENABLE ROW LEVEL SECURITY;

-- 2. Включаем RLS для таблиц периодов испытаний (если существуют)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qualification_object_testing_periods') THEN
        ALTER TABLE qualification_object_testing_periods ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для qualification_object_testing_periods';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testing_period_documents') THEN
        ALTER TABLE testing_period_documents ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS включен для testing_period_documents';
    END IF;
END $$;

-- 3. Создаем универсальные политики для всех таблиц
DO $$
DECLARE
    tbl_name text;
    tables_to_check text[] := ARRAY[
        'projects', 'contractors', 'qualification_objects', 
        'project_qualification_objects', 'qualification_protocols',
        'project_documents', 'document_approvals', 'document_comments',
        'qualification_object_testing_periods', 'testing_period_documents',
        'qualification_work_schedule', 'uploaded_files', 
        'logger_data', 'logger_data_summary'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_check
    LOOP
        -- Проверяем существование таблицы
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) THEN
            -- Удаляем старые политики
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update for users based on user_id" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for anon users" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can manage testing periods" ON %I', tbl_name);
            EXECUTE format('DROP POLICY IF EXISTS "Users can manage testing period documents" ON %I', tbl_name);
            
            -- Создаем новые политики
            EXECUTE format('CREATE POLICY "%s_select_policy" ON %I FOR SELECT TO public USING (true)', tbl_name, tbl_name);
            EXECUTE format('CREATE POLICY "%s_insert_policy" ON %I FOR INSERT TO public WITH CHECK (true)', tbl_name, tbl_name);
            EXECUTE format('CREATE POLICY "%s_update_policy" ON %I FOR UPDATE TO public USING (true) WITH CHECK (true)', tbl_name, tbl_name);
            EXECUTE format('CREATE POLICY "%s_delete_policy" ON %I FOR DELETE TO public USING (true)', tbl_name, tbl_name);
            
            RAISE NOTICE 'Политики созданы для таблицы %', tbl_name;
        END IF;
    END LOOP;
END $$;

-- 4. Проверяем результат
SELECT 'RLS настроен успешно!' as status;
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'projects', 'contractors', 'qualification_objects', 
    'project_qualification_objects', 'qualification_protocols',
    'project_documents', 'document_approvals', 'document_comments',
    'qualification_object_testing_periods', 'testing_period_documents',
    'qualification_work_schedule', 'uploaded_files', 
    'logger_data', 'logger_data_summary'
  )
ORDER BY tablename;





















