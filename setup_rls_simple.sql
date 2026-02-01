-- ПРОСТАЯ НАСТРОЙКА RLS БЕЗ DO $$ БЛОКОВ
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Включаем RLS для основных таблиц
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
-- Эти команды выполнятся только если таблицы существуют
ALTER TABLE qualification_object_testing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE testing_period_documents ENABLE ROW LEVEL SECURITY;

-- 3. Удаляем старые политики для основных таблиц
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON projects;

DROP POLICY IF EXISTS "Enable read access for all users" ON contractors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contractors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contractors;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contractors;

DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_objects;

DROP POLICY IF EXISTS "Enable read access for all users" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON project_qualification_objects;

DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_protocols;

DROP POLICY IF EXISTS "Enable read access for all users" ON project_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_documents;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON project_documents;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON project_documents;

DROP POLICY IF EXISTS "Enable read access for all users" ON document_approvals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON document_approvals;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON document_approvals;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON document_approvals;

DROP POLICY IF EXISTS "Enable read access for all users" ON document_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON document_comments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON document_comments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON document_comments;

DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_work_schedule;

DROP POLICY IF EXISTS "Enable read access for all users" ON uploaded_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON uploaded_files;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON uploaded_files;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON uploaded_files;

DROP POLICY IF EXISTS "Enable read access for all users" ON logger_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON logger_data;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON logger_data;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON logger_data;

DROP POLICY IF EXISTS "Enable read access for all users" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON logger_data_summary;

-- 4. Удаляем старые политики для таблиц периодов испытаний
DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_object_testing_periods;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_object_testing_periods;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_object_testing_periods;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_object_testing_periods;
DROP POLICY IF EXISTS "Users can manage testing periods" ON qualification_object_testing_periods;

DROP POLICY IF EXISTS "Enable read access for all users" ON testing_period_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON testing_period_documents;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON testing_period_documents;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON testing_period_documents;
DROP POLICY IF EXISTS "Users can manage testing period documents" ON testing_period_documents;

-- 5. Создаем новые политики для основных таблиц
CREATE POLICY "projects_select_policy" ON projects FOR SELECT TO public USING (true);
CREATE POLICY "projects_insert_policy" ON projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete_policy" ON projects FOR DELETE TO public USING (true);

CREATE POLICY "contractors_select_policy" ON contractors FOR SELECT TO public USING (true);
CREATE POLICY "contractors_insert_policy" ON contractors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contractors_update_policy" ON contractors FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "contractors_delete_policy" ON contractors FOR DELETE TO public USING (true);

CREATE POLICY "qualification_objects_select_policy" ON qualification_objects FOR SELECT TO public USING (true);
CREATE POLICY "qualification_objects_insert_policy" ON qualification_objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "qualification_objects_update_policy" ON qualification_objects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "qualification_objects_delete_policy" ON qualification_objects FOR DELETE TO public USING (true);

CREATE POLICY "project_qualification_objects_select_policy" ON project_qualification_objects FOR SELECT TO public USING (true);
CREATE POLICY "project_qualification_objects_insert_policy" ON project_qualification_objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "project_qualification_objects_update_policy" ON project_qualification_objects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "project_qualification_objects_delete_policy" ON project_qualification_objects FOR DELETE TO public USING (true);

CREATE POLICY "qualification_protocols_select_policy" ON qualification_protocols FOR SELECT TO public USING (true);
CREATE POLICY "qualification_protocols_insert_policy" ON qualification_protocols FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "qualification_protocols_update_policy" ON qualification_protocols FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "qualification_protocols_delete_policy" ON qualification_protocols FOR DELETE TO public USING (true);

CREATE POLICY "project_documents_select_policy" ON project_documents FOR SELECT TO public USING (true);
CREATE POLICY "project_documents_insert_policy" ON project_documents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "project_documents_update_policy" ON project_documents FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "project_documents_delete_policy" ON project_documents FOR DELETE TO public USING (true);

CREATE POLICY "document_approvals_select_policy" ON document_approvals FOR SELECT TO public USING (true);
CREATE POLICY "document_approvals_insert_policy" ON document_approvals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "document_approvals_update_policy" ON document_approvals FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "document_approvals_delete_policy" ON document_approvals FOR DELETE TO public USING (true);

CREATE POLICY "document_comments_select_policy" ON document_comments FOR SELECT TO public USING (true);
CREATE POLICY "document_comments_insert_policy" ON document_comments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "document_comments_update_policy" ON document_comments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "document_comments_delete_policy" ON document_comments FOR DELETE TO public USING (true);

CREATE POLICY "qualification_work_schedule_select_policy" ON qualification_work_schedule FOR SELECT TO public USING (true);
CREATE POLICY "qualification_work_schedule_insert_policy" ON qualification_work_schedule FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "qualification_work_schedule_update_policy" ON qualification_work_schedule FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "qualification_work_schedule_delete_policy" ON qualification_work_schedule FOR DELETE TO public USING (true);

CREATE POLICY "uploaded_files_select_policy" ON uploaded_files FOR SELECT TO public USING (true);
CREATE POLICY "uploaded_files_insert_policy" ON uploaded_files FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "uploaded_files_update_policy" ON uploaded_files FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "uploaded_files_delete_policy" ON uploaded_files FOR DELETE TO public USING (true);

CREATE POLICY "logger_data_select_policy" ON logger_data FOR SELECT TO public USING (true);
CREATE POLICY "logger_data_insert_policy" ON logger_data FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "logger_data_update_policy" ON logger_data FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "logger_data_delete_policy" ON logger_data FOR DELETE TO public USING (true);

CREATE POLICY "logger_data_summary_select_policy" ON logger_data_summary FOR SELECT TO public USING (true);
CREATE POLICY "logger_data_summary_insert_policy" ON logger_data_summary FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "logger_data_summary_update_policy" ON logger_data_summary FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "logger_data_summary_delete_policy" ON logger_data_summary FOR DELETE TO public USING (true);

-- 6. Создаем новые политики для таблиц периодов испытаний
CREATE POLICY "qualification_object_testing_periods_select_policy" ON qualification_object_testing_periods FOR SELECT TO public USING (true);
CREATE POLICY "qualification_object_testing_periods_insert_policy" ON qualification_object_testing_periods FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "qualification_object_testing_periods_update_policy" ON qualification_object_testing_periods FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "qualification_object_testing_periods_delete_policy" ON qualification_object_testing_periods FOR DELETE TO public USING (true);

CREATE POLICY "testing_period_documents_select_policy" ON testing_period_documents FOR SELECT TO public USING (true);
CREATE POLICY "testing_period_documents_insert_policy" ON testing_period_documents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "testing_period_documents_update_policy" ON testing_period_documents FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "testing_period_documents_delete_policy" ON testing_period_documents FOR DELETE TO public USING (true);

-- 7. Проверяем результат
SELECT 'RLS настроен успешно!' as status;

-- 8. Показываем статус RLS для всех таблиц
SELECT 
    tablename,
    rowsecurity as rls_enabled
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





















