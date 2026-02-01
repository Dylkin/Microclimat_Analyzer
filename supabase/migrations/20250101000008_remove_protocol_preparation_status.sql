/*
  # Удаление статуса protocol_preparation из enum project_status
  
  Удаляем статус 'protocol_preparation' из enum и обновляем все проекты с этим статусом на 'testing_execution'.
*/

DO $$
BEGIN
  -- Обновляем все проекты со статусом protocol_preparation на testing_execution
  UPDATE public.projects
  SET status = 'testing_execution'::project_status
  WHERE status::text = 'protocol_preparation';

  -- Создаем новый enum без protocol_preparation
  CREATE TYPE project_status_new AS ENUM (
    'contract_negotiation',
    'testing_execution',
    'report_preparation',
    'report_approval',
    'report_printing',
    'completed'
  );

  -- Удаляем значение по умолчанию
  ALTER TABLE public.projects
    ALTER COLUMN status DROP DEFAULT;

  -- Изменяем тип колонки status на новый enum
  ALTER TABLE public.projects
    ALTER COLUMN status TYPE project_status_new
    USING status::text::project_status_new;

  -- Устанавливаем новое значение по умолчанию
  ALTER TABLE public.projects
    ALTER COLUMN status SET DEFAULT 'contract_negotiation'::project_status_new;

  -- Удаляем старый enum
  DROP TYPE project_status;

  -- Переименовываем новый enum в старое имя
  ALTER TYPE project_status_new RENAME TO project_status;
END $$;

