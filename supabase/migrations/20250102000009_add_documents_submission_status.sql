-- Добавление статуса 'documents_submission' (Подача документов) в enum project_status
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
        AND enumlabel = 'documents_submission'
    ) THEN
      ALTER TYPE project_status ADD VALUE 'documents_submission';
    END IF;
  END IF;
END $$;


