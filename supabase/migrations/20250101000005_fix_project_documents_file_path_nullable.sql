/*
  # Исправление ограничения NOT NULL для file_path в таблице project_documents
  
  Делаем file_path nullable, так как мы используем file_url вместо file_path.
*/

-- Удаляем ограничение NOT NULL с file_path, если оно существует
DO $$ 
BEGIN
  -- Проверяем, есть ли ограничение NOT NULL на file_path
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_documents' 
    AND column_name = 'file_path'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.project_documents ALTER COLUMN file_path DROP NOT NULL;
  END IF;
END $$;


