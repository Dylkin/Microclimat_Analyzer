-- Финальное исправление типа поля measurement_level
-- Выполните эти команды по порядку в Supabase SQL Editor

-- 1. Удаляем ВСЕ представления, которые могут блокировать изменение
DROP VIEW IF EXISTS logger_data_analysis CASCADE;
DROP VIEW IF EXISTS logger_data_analysis_backup CASCADE;

-- 2. Изменяем типы полей в таблицах
ALTER TABLE logger_data_summary 
ALTER COLUMN measurement_level TYPE numeric(10,2);

ALTER TABLE logger_data_records 
ALTER COLUMN measurement_level TYPE numeric(10,2);

-- 3. Исправляем uploaded_files (с конвертацией из text)
-- Сначала конвертируем в text для работы с регулярными выражениями
ALTER TABLE uploaded_files 
ALTER COLUMN measurement_level TYPE text;

-- Затем обновляем данные
UPDATE uploaded_files 
SET measurement_level = CASE 
    WHEN measurement_level ~ '^[0-9]+\.?[0-9]*$' THEN measurement_level
    WHEN measurement_level = '' THEN NULL
    ELSE '0'
END;

-- И наконец конвертируем в numeric
ALTER TABLE uploaded_files 
ALTER COLUMN measurement_level TYPE numeric(10,2) 
USING measurement_level::numeric(10,2);

-- 4. Проверяем результат
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'measurement_level' 
AND table_schema = 'public'
ORDER BY table_name;

-- 5. Проверяем, что данные корректны
SELECT 
    'logger_data_summary' as table_name,
    measurement_level,
    COUNT(*) as count
FROM logger_data_summary 
GROUP BY measurement_level
UNION ALL
SELECT 
    'logger_data_records' as table_name,
    measurement_level,
    COUNT(*) as count
FROM logger_data_records 
GROUP BY measurement_level
UNION ALL
SELECT 
    'uploaded_files' as table_name,
    measurement_level,
    COUNT(*) as count
FROM uploaded_files 
GROUP BY measurement_level
ORDER BY table_name, measurement_level;
