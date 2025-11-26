/*
  # Исправление колонок в таблице project_documents
  
  Добавляем недостающие колонки file_url и uploaded_at, если они отсутствуют.
*/

-- Добавляем file_url, если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_documents' 
    AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.project_documents ADD COLUMN file_url TEXT;
  END IF;
END $$;

-- Добавляем uploaded_at, если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_documents' 
    AND column_name = 'uploaded_at'
  ) THEN
    ALTER TABLE public.project_documents ADD COLUMN uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Заполняем uploaded_at значениями из created_at для существующих записей
    UPDATE public.project_documents 
    SET uploaded_at = created_at 
    WHERE uploaded_at IS NULL;
  END IF;
END $$;

-- Удаляем file_content, если он существует (заменен на file_url)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_documents' 
    AND column_name = 'file_content'
  ) THEN
    ALTER TABLE public.project_documents DROP COLUMN file_content;
  END IF;
END $$;


