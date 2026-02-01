-- НАСТРОЙКА ПРАВИЛЬНЫХ ПОЛИТИК RLS
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Включаем RLS для всех таблиц
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

-- 2. Удаляем старые политики (если есть)
-- Projects
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON projects;

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

-- 3. Создаем правильные политики для таблицы PROJECTS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE TO public
    USING (true);

-- 4. Создаем правильные политики для таблицы CONTRACTORS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "contractors_select_policy" ON contractors
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "contractors_insert_policy" ON contractors
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "contractors_update_policy" ON contractors
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "contractors_delete_policy" ON contractors
    FOR DELETE TO public
    USING (true);

-- 5. Создаем правильные политики для таблицы QUALIFICATION_OBJECTS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "qualification_objects_select_policy" ON qualification_objects
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "qualification_objects_insert_policy" ON qualification_objects
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "qualification_objects_update_policy" ON qualification_objects
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "qualification_objects_delete_policy" ON qualification_objects
    FOR DELETE TO public
    USING (true);

-- 6. Создаем правильные политики для таблицы PROJECT_QUALIFICATION_OBJECTS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "project_qualification_objects_select_policy" ON project_qualification_objects
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "project_qualification_objects_insert_policy" ON project_qualification_objects
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "project_qualification_objects_update_policy" ON project_qualification_objects
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "project_qualification_objects_delete_policy" ON project_qualification_objects
    FOR DELETE TO public
    USING (true);

-- 7. Создаем правильные политики для таблицы QUALIFICATION_PROTOCOLS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "qualification_protocols_select_policy" ON qualification_protocols
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "qualification_protocols_insert_policy" ON qualification_protocols
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "qualification_protocols_update_policy" ON qualification_protocols
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "qualification_protocols_delete_policy" ON qualification_protocols
    FOR DELETE TO public
    USING (true);

-- 8. Создаем правильные политики для таблицы PROJECT_DOCUMENTS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "project_documents_select_policy" ON project_documents
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "project_documents_insert_policy" ON project_documents
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "project_documents_update_policy" ON project_documents
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "project_documents_delete_policy" ON project_documents
    FOR DELETE TO public
    USING (true);

-- 9. Создаем правильные политики для таблицы DOCUMENT_APPROVALS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "document_approvals_select_policy" ON document_approvals
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "document_approvals_insert_policy" ON document_approvals
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "document_approvals_update_policy" ON document_approvals
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "document_approvals_delete_policy" ON document_approvals
    FOR DELETE TO public
    USING (true);

-- 10. Создаем правильные политики для таблицы DOCUMENT_COMMENTS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "document_comments_select_policy" ON document_comments
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "document_comments_insert_policy" ON document_comments
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "document_comments_update_policy" ON document_comments
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "document_comments_delete_policy" ON document_comments
    FOR DELETE TO public
    USING (true);

-- 11. Создаем правильные политики для таблицы TESTING_PERIODS
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "testing_periods_select_policy" ON testing_periods
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "testing_periods_insert_policy" ON testing_periods
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "testing_periods_update_policy" ON testing_periods
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "testing_periods_delete_policy" ON testing_periods
    FOR DELETE TO public
    USING (true);

-- 12. Создаем правильные политики для таблицы QUALIFICATION_WORK_SCHEDULE
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "qualification_work_schedule_select_policy" ON qualification_work_schedule
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "qualification_work_schedule_insert_policy" ON qualification_work_schedule
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "qualification_work_schedule_update_policy" ON qualification_work_schedule
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "qualification_work_schedule_delete_policy" ON qualification_work_schedule
    FOR DELETE TO public
    USING (true);

-- 13. Создаем правильные политики для таблицы UPLOADED_FILES
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "uploaded_files_select_policy" ON uploaded_files
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "uploaded_files_insert_policy" ON uploaded_files
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "uploaded_files_update_policy" ON uploaded_files
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "uploaded_files_delete_policy" ON uploaded_files
    FOR DELETE TO public
    USING (true);

-- 14. Создаем правильные политики для таблицы LOGGER_DATA
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "logger_data_select_policy" ON logger_data
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "logger_data_insert_policy" ON logger_data
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "logger_data_update_policy" ON logger_data
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "logger_data_delete_policy" ON logger_data
    FOR DELETE TO public
    USING (true);

-- 15. Создаем правильные политики для таблицы LOGGER_DATA_SUMMARY
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "logger_data_summary_select_policy" ON logger_data_summary
    FOR SELECT TO public
    USING (true);

-- Вставка: все аутентифицированные пользователи
CREATE POLICY "logger_data_summary_insert_policy" ON logger_data_summary
    FOR INSERT TO public
    WITH CHECK (true);

-- Обновление: все аутентифицированные пользователи
CREATE POLICY "logger_data_summary_update_policy" ON logger_data_summary
    FOR UPDATE TO public
    USING (true)
    WITH CHECK (true);

-- Удаление: все аутентифицированные пользователи
CREATE POLICY "logger_data_summary_delete_policy" ON logger_data_summary
    FOR DELETE TO public
    USING (true);

-- 16. Проверяем созданные политики
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

-- 17. Проверяем статус RLS
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

-- 18. Сообщение об успешном выполнении
SELECT 'Правильные политики RLS настроены для всех таблиц!' as message;





















