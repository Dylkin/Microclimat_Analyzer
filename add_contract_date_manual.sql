-- Скрипт для ручного добавления поля contract_date в таблицу projects
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем текущую структуру таблицы projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Добавляем поле contract_date если его нет
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;

-- 3. Добавляем комментарий к полю
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';

-- 4. Проверяем, что поле добавлено
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Проверяем, что таблица доступна для обновления
SELECT COUNT(*) as project_count FROM public.projects;



















