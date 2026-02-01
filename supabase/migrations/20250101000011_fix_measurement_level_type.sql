-- Исправление типа measurement_level с INTEGER на NUMERIC
-- Это необходимо для поддержки дробных значений уровня измерения (например, 0.3)

DO $$
BEGIN
  -- Изменяем тип measurement_level в logger_data_summary
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_summary' 
             AND column_name = 'measurement_level') THEN
    -- Проверяем текущий тип
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'logger_data_summary' 
               AND column_name = 'measurement_level' 
               AND (data_type = 'integer' OR numeric_precision IS NULL)) THEN
      ALTER TABLE public.logger_data_summary 
      ALTER COLUMN measurement_level TYPE NUMERIC(10,2) 
      USING CASE 
        WHEN measurement_level IS NULL THEN NULL
        ELSE measurement_level::NUMERIC(10,2)
      END;
      RAISE NOTICE 'Изменен тип measurement_level с INTEGER на NUMERIC(10,2) в logger_data_summary.';
    ELSE
      RAISE NOTICE 'measurement_level в logger_data_summary уже имеет тип NUMERIC.';
    END IF;
  END IF;

  -- Изменяем тип measurement_level в logger_data_records
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'measurement_level') THEN
    -- Проверяем текущий тип
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'logger_data_records' 
               AND column_name = 'measurement_level' 
               AND (data_type = 'integer' OR numeric_precision IS NULL)) THEN
      ALTER TABLE public.logger_data_records 
      ALTER COLUMN measurement_level TYPE NUMERIC(10,2) 
      USING CASE 
        WHEN measurement_level IS NULL THEN NULL
        ELSE measurement_level::NUMERIC(10,2)
      END;
      RAISE NOTICE 'Изменен тип measurement_level с INTEGER на NUMERIC(10,2) в logger_data_records.';
    ELSE
      RAISE NOTICE 'measurement_level в logger_data_records уже имеет тип NUMERIC.';
    END IF;
  END IF;

  RAISE NOTICE 'Типы measurement_level успешно обновлены.';
END $$;


