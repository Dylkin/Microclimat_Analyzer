-- Быстрая проверка поля contract_date в таблице projects
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем структуру таблицы projects
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
  AND column_name IN ('contract_number', 'contract_date')
ORDER BY column_name;

-- 2. Проверяем данные в таблице projects
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  created_at,
  updated_at
FROM public.projects
LIMIT 5;

-- 3. Если поле contract_date отсутствует, добавляем его
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;

-- 4. Добавляем комментарий к столбцу
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';

-- 5. Проверяем структуру после изменений
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
  AND column_name IN ('contract_number', 'contract_date')
ORDER BY column_name;



















