-- Добавление недостающих значений в enum project_status.
-- Фикс 500 (invalid input value for enum project_status) при смене статуса проекта
-- на значения 'documents_submission' / 'not_suitable' и др.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'documents_submission'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'documents_submission';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'not_suitable'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'not_suitable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'creating_report'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'creating_report';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'supplier_search'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'supplier_search';
  END IF;
END
$$;
