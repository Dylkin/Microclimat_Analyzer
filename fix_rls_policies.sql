-- Исправление политик Row Level Security для таблицы projects
-- Выполните эти команды в SQL Editor в Supabase Dashboard

-- 1. Временно отключаем RLS для тестирования
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Или создаем политику, которая разрешает всем пользователям создавать проекты
-- (раскомментируйте, если хотите использовать политики вместо отключения RLS)
/*
CREATE POLICY "Allow all users to create projects" ON projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to read projects" ON projects
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to update projects" ON projects
    FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete projects" ON projects
    FOR DELETE USING (true);
*/

-- 3. Аналогично для других таблиц, которые могут иметь проблемы с RLS
ALTER TABLE project_qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE contractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_object_testing_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE testing_period_documents DISABLE ROW LEVEL SECURITY;

-- 4. Создаем недостающую таблицу equipment
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

-- 5. Отключаем RLS для таблицы equipment
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;

-- 6. Проверяем статус RLS для всех таблиц
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'project_qualification_objects', 'qualification_objects', 'contractors', 'users', 'equipment', 'qualification_object_testing_periods', 'testing_period_documents');
