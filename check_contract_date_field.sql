-- Проверка наличия поля contract_date в таблице projects
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем структуру таблицы projects
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем, есть ли поле contract_date
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND table_schema = 'public' 
  AND column_name = 'contract_date';

-- 3. Показываем несколько записей из таблицы projects для проверки
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  created_at,
  updated_at
FROM public.projects
LIMIT 5;

-- 4. Если поле contract_date отсутствует, добавляем его
-- Раскомментируйте следующие строки если поле отсутствует:
-- ALTER TABLE public.projects 
-- ADD COLUMN IF NOT EXISTS contract_date date;
-- COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';