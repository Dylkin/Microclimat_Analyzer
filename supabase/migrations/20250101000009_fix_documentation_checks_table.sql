/*
  # Исправление таблицы documentation_checks
  
  Добавляем недостающие колонки: qualification_object_id, items, checked_by_name
*/

-- Добавляем qualification_object_id, если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'qualification_object_id'
  ) THEN
    ALTER TABLE public.documentation_checks ADD COLUMN qualification_object_id UUID REFERENCES public.qualification_objects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Добавляем items (JSONB), если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'items'
  ) THEN
    ALTER TABLE public.documentation_checks ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Добавляем checked_by_name, если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'checked_by_name'
  ) THEN
    ALTER TABLE public.documentation_checks ADD COLUMN checked_by_name TEXT;
  END IF;
END $$;

-- Удаляем check_type, если он есть (заменен на items)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'check_type'
  ) THEN
    ALTER TABLE public.documentation_checks DROP COLUMN check_type;
  END IF;
END $$;

-- Удаляем status, если он есть (заменен на items)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.documentation_checks DROP COLUMN status;
  END IF;
END $$;

-- Удаляем notes, если он есть (заменен на items)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'documentation_checks' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.documentation_checks DROP COLUMN notes;
  END IF;
END $$;

-- Создаем индекс для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_documentation_checks_qualification_object_id 
  ON public.documentation_checks(qualification_object_id);
CREATE INDEX IF NOT EXISTS idx_documentation_checks_project_id 
  ON public.documentation_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_documentation_checks_checked_at 
  ON public.documentation_checks(checked_at);


