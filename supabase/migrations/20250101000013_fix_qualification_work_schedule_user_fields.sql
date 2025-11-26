-- Изменение типа полей completed_by и cancelled_by с UUID на TEXT
-- для хранения ФИО пользователя вместо ID

DO $$
BEGIN
  -- Изменяем тип completed_by с UUID на TEXT
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'qualification_work_schedule' 
             AND column_name = 'completed_by' 
             AND data_type = 'uuid') THEN
    -- Удаляем внешний ключ, если он существует
    ALTER TABLE public.qualification_work_schedule 
    DROP CONSTRAINT IF EXISTS qualification_work_schedule_completed_by_fkey;
    
    -- Изменяем тип колонки
    ALTER TABLE public.qualification_work_schedule 
    ALTER COLUMN completed_by TYPE TEXT USING completed_by::TEXT;
    
    RAISE NOTICE 'Изменен тип completed_by с UUID на TEXT в qualification_work_schedule.';
  END IF;

  -- Изменяем тип cancelled_by с UUID на TEXT
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'qualification_work_schedule' 
             AND column_name = 'cancelled_by' 
             AND data_type = 'uuid') THEN
    -- Удаляем внешний ключ, если он существует
    ALTER TABLE public.qualification_work_schedule 
    DROP CONSTRAINT IF EXISTS qualification_work_schedule_cancelled_by_fkey;
    
    -- Изменяем тип колонки
    ALTER TABLE public.qualification_work_schedule 
    ALTER COLUMN cancelled_by TYPE TEXT USING cancelled_by::TEXT;
    
    RAISE NOTICE 'Изменен тип cancelled_by с UUID на TEXT в qualification_work_schedule.';
  END IF;

  RAISE NOTICE 'Поля completed_by и cancelled_by успешно изменены на TEXT.';
END $$;


