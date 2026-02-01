/*
  # Создание таблицы для отслеживания всех файлов проекта
  
  Создаем централизованную таблицу для регистрации всех файлов, загружаемых в проекте.
*/

-- Таблица для отслеживания всех файлов проекта
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL, -- 'document', 'plan', 'test_data', 'protocol', 'other'
  file_category TEXT, -- 'commercial_offer', 'contract', 'qualification_protocol', 'object_plan', 'test_data', etc.
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT, -- Локальный путь к файлу
  file_size BIGINT,
  mime_type TEXT,
  related_table TEXT, -- 'project_documents', 'qualification_objects', 'qualification_protocols', etc.
  related_id UUID, -- ID записи в связанной таблице
  uploaded_by UUID REFERENCES public.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_file_type ON public.project_files(file_type);
CREATE INDEX IF NOT EXISTS idx_project_files_file_category ON public.project_files(file_category);
CREATE INDEX IF NOT EXISTS idx_project_files_related_table ON public.project_files(related_table);
CREATE INDEX IF NOT EXISTS idx_project_files_related_id ON public.project_files(related_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_at ON public.project_files(uploaded_at);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_files_updated_at_trigger
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION update_project_files_updated_at();


