-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Отключение RLS для таблицы projects
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Отключаем RLS для таблицы projects
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики RLS для таблицы projects
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- 3. Предоставляем полные права на таблицу projects
GRANT ALL PRIVILEGES ON TABLE projects TO public;
GRANT ALL PRIVILEGES ON TABLE projects TO anon;
GRANT ALL PRIVILEGES ON TABLE projects TO public;

-- 4. Отключаем RLS для других критических таблиц
ALTER TABLE contractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_protocols DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE testing_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_work_schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE logger_data_summary DISABLE ROW LEVEL SECURITY;

-- 5. Удаляем все политики RLS для других таблиц
-- Contractors
DROP POLICY IF EXISTS "Enable read access for all users" ON contractors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contractors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contractors;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contractors;

-- Qualification objects
DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_objects;

-- Project qualification objects
DROP POLICY IF EXISTS "Enable read access for all users" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON project_qualification_objects;

-- Qualification protocols
DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_protocols;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_protocols;

-- Project documents
DROP POLICY IF EXISTS "Enable read access for all users" ON project_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_documents;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON project_documents;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON project_documents;

-- Document approvals
DROP POLICY IF EXISTS "Enable read access for all users" ON document_approvals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON document_approvals;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON document_approvals;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON document_approvals;

-- Document comments
DROP POLICY IF EXISTS "Enable read access for all users" ON document_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON document_comments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON document_comments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON document_comments;

-- Testing periods
DROP POLICY IF EXISTS "Enable read access for all users" ON testing_periods;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON testing_periods;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON testing_periods;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON testing_periods;

-- Qualification work schedule
DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_work_schedule;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_work_schedule;

-- Uploaded files
DROP POLICY IF EXISTS "Enable read access for all users" ON uploaded_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON uploaded_files;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON uploaded_files;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON uploaded_files;

-- Logger data
DROP POLICY IF EXISTS "Enable read access for all users" ON logger_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON logger_data;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON logger_data;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON logger_data;

-- Logger data summary
DROP POLICY IF EXISTS "Enable read access for all users" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON logger_data_summary;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON logger_data_summary;

-- 6. Предоставляем полные права на все таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO public;

-- 7. Предоставляем права на последовательности
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO public;

-- 8. Проверяем статус RLS для всех таблиц
SELECT 
  schemaname,
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

-- 9. Сообщение об успешном выполнении
SELECT 'RLS отключен для всех критических таблиц!' as message;






















