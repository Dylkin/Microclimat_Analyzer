-- Добавление статуса 'supplier_search' в enum project_status для проектов типа 'sale'
DO $$
BEGIN
  -- Проверяем, существует ли тип project_status
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'project_status'
  ) THEN
    -- Добавляем новое значение, если его еще нет
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'project_status'::regtype
        AND enumlabel = 'supplier_search'
    ) THEN
      ALTER TYPE project_status ADD VALUE 'supplier_search';
    END IF;
  END IF;
END $$;


