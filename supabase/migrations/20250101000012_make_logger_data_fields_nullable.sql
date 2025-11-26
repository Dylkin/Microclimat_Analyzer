-- Делаем поля device_type, device_model, serial_number nullable в logger_data_records
-- Это необходимо, так как метаданные устройства могут быть недоступны при парсинге некоторых файлов

DO $$
BEGIN
  -- Изменяем device_type на nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'device_type' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.logger_data_records 
    ALTER COLUMN device_type DROP NOT NULL;
    RAISE NOTICE 'Поле device_type в logger_data_records теперь nullable.';
  END IF;

  -- Изменяем device_model на nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'device_model' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.logger_data_records 
    ALTER COLUMN device_model DROP NOT NULL;
    RAISE NOTICE 'Поле device_model в logger_data_records теперь nullable.';
  END IF;

  -- Изменяем serial_number на nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'serial_number' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.logger_data_records 
    ALTER COLUMN serial_number DROP NOT NULL;
    RAISE NOTICE 'Поле serial_number в logger_data_records теперь nullable.';
  END IF;

  -- Также делаем logger_name nullable, если оно NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'logger_data_records' 
             AND column_name = 'logger_name' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE public.logger_data_records 
    ALTER COLUMN logger_name DROP NOT NULL;
    RAISE NOTICE 'Поле logger_name в logger_data_records теперь nullable.';
  END IF;

  RAISE NOTICE 'Поля в logger_data_records успешно обновлены для поддержки NULL значений.';
END $$;


