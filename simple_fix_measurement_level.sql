-- Простое исправление типа поля measurement_level
-- Выполните эти команды по порядку

-- 1. Удаляем представление, которое блокирует изменение
DROP VIEW IF EXISTS logger_data_analysis CASCADE;

-- 2. Изменяем типы полей
ALTER TABLE logger_data_summary 
ALTER COLUMN measurement_level TYPE numeric(10,2);

ALTER TABLE logger_data_records 
ALTER COLUMN measurement_level TYPE numeric(10,2);

-- 3. Исправляем uploaded_files
UPDATE uploaded_files 
SET measurement_level = CASE 
    WHEN measurement_level ~ '^[0-9]+\.?[0-9]*$' THEN measurement_level
    WHEN measurement_level = '' THEN NULL
    ELSE '0'
END;

ALTER TABLE uploaded_files 
ALTER COLUMN measurement_level TYPE numeric(10,2) 
USING measurement_level::numeric(10,2);

-- 4. Проверяем результат
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'measurement_level' 
AND table_schema = 'public'
ORDER BY table_name;



















