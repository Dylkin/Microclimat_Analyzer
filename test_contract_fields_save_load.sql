-- Тестовый скрипт для проверки сохранения и загрузки полей договора
-- Выполнять в Supabase SQL Editor

-- 1. Проверяем текущие данные проекта
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  updated_at
FROM public.projects 
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 2. Обновляем данные договора (тестовые значения)
UPDATE public.projects 
SET 
  contract_number = 'TEST-2025-001',
  contract_date = '2025-01-15',
  updated_at = now()
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 3. Проверяем обновленные данные
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  updated_at
FROM public.projects 
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 4. Возвращаем исходные данные
UPDATE public.projects 
SET 
  contract_number = 'ВР-15-25',
  contract_date = '2025-10-01',
  updated_at = now()
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';

-- 5. Финальная проверка
SELECT 
  id,
  name,
  contract_number,
  contract_date,
  updated_at
FROM public.projects 
WHERE id = '36b01543-0e89-4954-956a-77a370f78954';



















