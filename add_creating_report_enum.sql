-- Скрипт для добавления значения 'creating_report' в enum project_status

-- 1. Сначала проверим текущие значения enum
SELECT unnest(enum_range(NULL::project_status)) AS current_values;

-- 2. Добавляем новое значение в enum
ALTER TYPE project_status ADD VALUE 'creating_report';

-- 3. Проверяем, что значение добавлено
SELECT unnest(enum_range(NULL::project_status)) AS updated_values;

-- 4. Проверяем, что таблица projects использует этот enum
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'status';




















