-- Добавление статуса 'not_suitable' (Не подходит) в enum project_status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'project_status'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'project_status'::regtype
        AND enumlabel = 'not_suitable'
    ) THEN
      ALTER TYPE project_status ADD VALUE 'not_suitable';
    END IF;
  END IF;
END $$;



