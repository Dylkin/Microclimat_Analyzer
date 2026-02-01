-- Исправление структуры таблиц для данных логгеров
-- Добавление недостающих столбцов в logger_data_summary и создание logger_data_records

DO $$
BEGIN
  -- Добавляем недостающие столбцы в logger_data_summary, если их нет
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'zone_number') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN zone_number INTEGER;
    RAISE NOTICE 'Добавлена колонка zone_number в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'logger_name') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN logger_name TEXT;
    RAISE NOTICE 'Добавлена колонка logger_name в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'file_name') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN file_name TEXT;
    RAISE NOTICE 'Добавлена колонка file_name в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'device_type') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN device_type INTEGER;
    RAISE NOTICE 'Добавлена колонка device_type в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'device_model') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN device_model TEXT;
    RAISE NOTICE 'Добавлена колонка device_model в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'serial_number') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN serial_number TEXT;
    RAISE NOTICE 'Добавлена колонка serial_number в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'start_date') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Добавлена колонка start_date в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'end_date') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Добавлена колонка end_date в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'record_count') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN record_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Добавлена колонка record_count в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'parsing_status') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN parsing_status TEXT DEFAULT 'processing' CHECK (parsing_status IN ('processing', 'completed', 'error'));
    RAISE NOTICE 'Добавлена колонка parsing_status в logger_data_summary.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logger_data_summary' AND column_name = 'error_message') THEN
    ALTER TABLE public.logger_data_summary ADD COLUMN error_message TEXT;
    RAISE NOTICE 'Добавлена колонка error_message в logger_data_summary.';
  END IF;

  -- Изменяем тип measurement_level на NUMERIC, если он INTEGER
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_summary' 
             AND column_name = 'measurement_level' 
             AND data_type = 'integer') THEN
    ALTER TABLE public.logger_data_summary 
    ALTER COLUMN measurement_level TYPE NUMERIC(10,2) USING measurement_level::NUMERIC(10,2);
    RAISE NOTICE 'Изменен тип measurement_level с INTEGER на NUMERIC(10,2) в logger_data_summary.';
  END IF;

  -- Создаем таблицу logger_data_records, если её нет
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logger_data_records') THEN
    CREATE TABLE IF NOT EXISTS public.logger_data_records (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
      zone_number INTEGER NOT NULL,
      measurement_level NUMERIC(10,2) NOT NULL,
      logger_name TEXT,
      file_name TEXT NOT NULL,
      device_type INTEGER,
      device_model TEXT,
      serial_number TEXT,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      temperature DECIMAL(10,2) NOT NULL,
      humidity DECIMAL(5,2),
      is_valid BOOLEAN NOT NULL DEFAULT true,
      validation_errors TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Создаем индексы для оптимизации запросов
    CREATE INDEX IF NOT EXISTS idx_logger_data_records_project_object 
      ON public.logger_data_records(project_id, qualification_object_id);
    
    CREATE INDEX IF NOT EXISTS idx_logger_data_records_zone_level 
      ON public.logger_data_records(zone_number, measurement_level);
    
    CREATE INDEX IF NOT EXISTS idx_logger_data_records_timestamp 
      ON public.logger_data_records(timestamp);
    
    CREATE INDEX IF NOT EXISTS idx_logger_data_records_logger_name 
      ON public.logger_data_records(logger_name);
    
    CREATE INDEX IF NOT EXISTS idx_logger_data_records_composite 
      ON public.logger_data_records(project_id, qualification_object_id, zone_number, measurement_level, timestamp);

    RAISE NOTICE 'Создана таблица logger_data_records.';
  END IF;

  -- Изменяем тип measurement_level в logger_data_records, если он INTEGER
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'measurement_level' 
             AND data_type = 'integer') THEN
    ALTER TABLE public.logger_data_records 
    ALTER COLUMN measurement_level TYPE NUMERIC(10,2) USING measurement_level::NUMERIC(10,2);
    RAISE NOTICE 'Изменен тип measurement_level с INTEGER на NUMERIC(10,2) в logger_data_records.';
  END IF;

  -- Создаем индексы для logger_data_summary, если их нет
  CREATE INDEX IF NOT EXISTS idx_logger_data_summary_zone_level 
    ON public.logger_data_summary(zone_number, measurement_level);
  
  CREATE INDEX IF NOT EXISTS idx_logger_data_summary_parsing_status 
    ON public.logger_data_summary(parsing_status);

  RAISE NOTICE 'Таблицы для данных логгеров успешно обновлены.';
END $$;

