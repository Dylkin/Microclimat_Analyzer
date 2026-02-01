-- БЫСТРОЕ ИСПРАВЛЕНИЕ: Отключение RLS для таблицы projects
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Отключаем RLS для критических таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
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

-- 2. Предоставляем полные права
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO public, anon, public;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO public, anon, public;

-- 3. Проверяем результат
SELECT 'RLS отключен!' as status;
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'projects';






















