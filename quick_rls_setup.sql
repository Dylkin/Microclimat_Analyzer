-- БЫСТРАЯ НАСТРОЙКА ПРАВИЛЬНЫХ ПОЛИТИК RLS
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Включаем RLS для критических таблиц
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE testing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data_summary ENABLE ROW LEVEL SECURITY;

-- 2. Создаем универсальные политики для всех таблиц
-- Функция для создания политик для таблицы
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'projects', 'contractors', 'qualification_objects', 
        'project_qualification_objects', 'qualification_protocols',
        'project_documents', 'document_approvals', 'document_comments',
        'testing_periods', 'qualification_work_schedule', 
        'uploaded_files', 'logger_data', 'logger_data_summary'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
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
    END LOOP;
END $$;

-- 3. Проверяем результат
SELECT 'Политики RLS настроены!' as status;
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'projects';





















