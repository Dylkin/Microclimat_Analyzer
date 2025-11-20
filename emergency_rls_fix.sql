-- ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ ТАБЛИЦЫ PROJECTS
-- Выполните эти команды в SQL Editor в Supabase Dashboard

-- 1. Принудительно отключаем RLS для таблицы projects
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все существующие политики для таблицы projects
DROP POLICY IF EXISTS "Allow all users to create projects" ON projects;
DROP POLICY IF EXISTS "Allow all users to read projects" ON projects;
DROP POLICY IF EXISTS "Allow all users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow all users to delete projects" ON projects;

-- 3. Проверяем статус RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- 4. Если RLS все еще включен, создаем разрешающую политику
CREATE POLICY "Allow all operations on projects" ON projects
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Проверяем все таблицы проекта
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_qualification_objects', 'qualification_objects', 'contractors', 'users', 'equipment');

-- 6. Отключаем RLS для всех связанных таблиц
ALTER TABLE project_qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE contractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 7. Создаем таблицу equipment если не существует
CREATE TABLE IF NOT EXISTS equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255),
    manufacturer VARCHAR(255),
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;


























