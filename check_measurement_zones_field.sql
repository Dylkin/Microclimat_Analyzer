-- Проверка и создание поля measurement_zones в таблице qualification_objects

-- Проверяем структуру таблицы qualification_objects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_objects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Проверяем, есть ли поле measurement_zones
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'qualification_objects' 
AND table_schema = 'public'
AND column_name = 'measurement_zones';

-- Если поле measurement_zones не существует, создаем его
-- Раскомментируйте следующие строки, если поле не найдено:

-- ALTER TABLE qualification_objects 
-- ADD COLUMN measurement_zones TEXT;

-- Добавляем комментарий к полю
-- COMMENT ON COLUMN qualification_objects.measurement_zones IS 'Зоны измерения в формате JSON';

-- Проверяем данные в таблице
SELECT 
    id,
    name,
    type,
    measurement_zones,
    created_at,
    updated_at
FROM qualification_objects 
LIMIT 5;























