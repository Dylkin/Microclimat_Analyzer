-- Создание поля measurement_zones в таблице qualification_objects

-- Проверяем, существует ли поле measurement_zones
DO $$
BEGIN
    -- Проверяем, есть ли уже поле measurement_zones
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'qualification_objects' 
        AND table_schema = 'public'
        AND column_name = 'measurement_zones'
    ) THEN
        -- Создаем поле measurement_zones
        ALTER TABLE qualification_objects 
        ADD COLUMN measurement_zones TEXT;
        
        -- Добавляем комментарий
        COMMENT ON COLUMN qualification_objects.measurement_zones IS 'Зоны измерения в формате JSON';
        
        RAISE NOTICE 'Поле measurement_zones успешно создано';
    ELSE
        RAISE NOTICE 'Поле measurement_zones уже существует';
    END IF;
END $$;

-- Проверяем результат
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'qualification_objects' 
AND table_schema = 'public'
AND column_name = 'measurement_zones';























