-- НАСТРОЙКА RLS ДЛЯ ТАБЛИЦ С ОТКЛЮЧЕННЫМ RLS
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Включаем RLS для таблиц, где он отключен
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики для этих таблиц
DROP POLICY IF EXISTS "Enable read access for all users" ON contractors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contractors;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contractors;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contractors;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON contractors;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON contractors;

DROP POLICY IF EXISTS "Enable read access for all users" ON equipment;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON equipment;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON equipment;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON equipment;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON equipment;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON equipment;

DROP POLICY IF EXISTS "Enable read access for all users" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON project_qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON project_qualification_objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON project_qualification_objects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON project_qualification_objects;

DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON projects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON projects;

DROP POLICY IF EXISTS "Enable read access for all users" ON qualification_objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON qualification_objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON qualification_objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON qualification_objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON qualification_objects;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON qualification_objects;

DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON users;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON users;

-- 3. Создаем новые политики для таблиц с отключенным RLS
-- Contractors
CREATE POLICY "contractors_select_policy" ON contractors FOR SELECT TO public USING (true);
CREATE POLICY "contractors_insert_policy" ON contractors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contractors_update_policy" ON contractors FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "contractors_delete_policy" ON contractors FOR DELETE TO public USING (true);

-- Equipment
CREATE POLICY "equipment_select_policy" ON equipment FOR SELECT TO public USING (true);
CREATE POLICY "equipment_insert_policy" ON equipment FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "equipment_update_policy" ON equipment FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "equipment_delete_policy" ON equipment FOR DELETE TO public USING (true);

-- Project qualification objects
CREATE POLICY "project_qualification_objects_select_policy" ON project_qualification_objects FOR SELECT TO public USING (true);
CREATE POLICY "project_qualification_objects_insert_policy" ON project_qualification_objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "project_qualification_objects_update_policy" ON project_qualification_objects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "project_qualification_objects_delete_policy" ON project_qualification_objects FOR DELETE TO public USING (true);

-- Projects
CREATE POLICY "projects_select_policy" ON projects FOR SELECT TO public USING (true);
CREATE POLICY "projects_insert_policy" ON projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete_policy" ON projects FOR DELETE TO public USING (true);

-- Qualification objects
CREATE POLICY "qualification_objects_select_policy" ON qualification_objects FOR SELECT TO public USING (true);
CREATE POLICY "qualification_objects_insert_policy" ON qualification_objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "qualification_objects_update_policy" ON qualification_objects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "qualification_objects_delete_policy" ON qualification_objects FOR DELETE TO public USING (true);

-- Users
CREATE POLICY "users_select_policy" ON users FOR SELECT TO public USING (true);
CREATE POLICY "users_insert_policy" ON users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "users_update_policy" ON users FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_policy" ON users FOR DELETE TO public USING (true);

-- 4. Проверяем результат
SELECT 'RLS настроен для всех таблиц!' as status;

-- 5. Показываем статус RLS для всех таблиц
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'contractors', 'equipment', 'project_qualification_objects', 
    'projects', 'qualification_objects', 'users'
  )
ORDER BY tablename;

-- 6. Показываем все таблицы с их статусом RLS
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





















