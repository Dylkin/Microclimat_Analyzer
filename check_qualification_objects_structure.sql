-- Проверка структуры таблицы qualification_objects
-- Выполнить в Supabase SQL Editor

-- 1. Все колонки в qualification_objects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'qualification_objects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Первые несколько записей для понимания структуры
SELECT * FROM qualification_objects LIMIT 3;















