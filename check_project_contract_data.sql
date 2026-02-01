-- Проверка данных договора для конкретного проекта
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем данные для проекта PharmDistri
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  status,
  created_at,
  updated_at
FROM public.projects 
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 2. Проверяем все проекты с данными договора
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  CASE 
    WHEN contract_number IS NOT NULL AND contract_date IS NOT NULL THEN 'Полные данные'
    WHEN contract_number IS NOT NULL OR contract_date IS NOT NULL THEN 'Частичные данные'
    ELSE 'Нет данных'
  END as contract_data_status
FROM public.projects 
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Проверяем структуру таблицы projects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'projects'
  AND column_name IN ('contract_number', 'contract_date')
ORDER BY ordinal_position;

-- 4. Обновляем тестовые данные для проекта (если нужно)
-- UPDATE public.projects 
-- SET 
--   contract_number = 'ВР-15-25',
--   contract_date = '2025-10-01',
--   updated_at = now()
-- WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 5. Проверяем обновленные данные
-- SELECT 
--   id,
--   name,
--   contract_number,
--   contract_date,
--   updated_at
-- FROM public.projects 
-- WHERE id = '36b01543-0e89-4954-956a-77a370f78954';