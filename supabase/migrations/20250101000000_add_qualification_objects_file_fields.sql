/*
  # Добавление полей для файлов в таблицу qualification_objects
  
  Добавляем недостающие колонки для хранения информации о файлах:
  - plan_file_url, plan_file_name - для файлов планов
  - test_data_file_url, test_data_file_name - для файлов данных испытаний
  - Другие поля из миграций
*/

-- Добавляем поле contractor_id, если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_id ON public.qualification_objects(contractor_id);
  END IF;
END $$;

-- Добавляем поля для файлов планов
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'plan_file_url'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN plan_file_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'plan_file_name'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN plan_file_name TEXT;
  END IF;
END $$;

-- Добавляем поля для файлов данных испытаний
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'test_data_file_url'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN test_data_file_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'test_data_file_name'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN test_data_file_name TEXT;
  END IF;
END $$;

-- Добавляем другие поля, если их нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN address TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN latitude NUMERIC(10,8);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN longitude NUMERIC(11,8);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'geocoded_at'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN geocoded_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'area'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN area NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'vin'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN vin TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN registration_number TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'body_volume'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN body_volume NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'inventory_number'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN inventory_number TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'chamber_volume'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN chamber_volume NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN serial_number TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE public.qualification_objects ADD COLUMN manufacturer TEXT;
  END IF;
END $$;

-- Изменяем measurement_zones с INTEGER на JSONB, если нужно
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'qualification_objects' 
    AND column_name = 'measurement_zones'
    AND data_type = 'integer'
  ) THEN
    -- Сначала удаляем значение по умолчанию
    ALTER TABLE public.qualification_objects 
    ALTER COLUMN measurement_zones DROP DEFAULT;
    
    -- Затем изменяем тип
    ALTER TABLE public.qualification_objects 
    ALTER COLUMN measurement_zones TYPE JSONB USING 
      CASE 
        WHEN measurement_zones = 0 THEN '[]'::jsonb
        ELSE jsonb_build_array(jsonb_build_object('zoneNumber', measurement_zones, 'measurementLevels', '[]'::jsonb))
      END;
    
    -- Устанавливаем новое значение по умолчанию
    ALTER TABLE public.qualification_objects 
    ALTER COLUMN measurement_zones SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Создаем индекс для measurement_zones, если его нет
CREATE INDEX IF NOT EXISTS idx_qualification_objects_measurement_zones 
ON public.qualification_objects USING gin (measurement_zones)
WHERE measurement_zones IS NOT NULL;

-- Создаем индекс для test_data_file_url, если его нет
CREATE INDEX IF NOT EXISTS idx_qualification_objects_test_data 
ON public.qualification_objects (test_data_file_url) 
WHERE test_data_file_url IS NOT NULL;

