-- Миграция: Добавление поля type в таблицу projects
-- Дата: 2025-01-02

-- Создание enum для типов проектов (если еще не существует)
DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('qualification', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавление поля type в таблицу projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS type project_type DEFAULT 'qualification';

-- Обновление всех существующих проектов, устанавливая тип 'qualification'
UPDATE projects 
SET type = 'qualification' 
WHERE type IS NULL;

-- Установка NOT NULL после обновления всех записей
ALTER TABLE projects 
ALTER COLUMN type SET NOT NULL;

-- Создание индекса для оптимизации запросов по типу
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);




