/*
  # Создание таблицы связей проектов и объектов квалификации
  
  Создаем таблицу для связи проектов с объектами квалификации,
  если она еще не существует.
*/

-- Создаем таблицу связей проектов и объектов квалификации
CREATE TABLE IF NOT EXISTS public.project_qualification_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  qualification_object_id UUID NOT NULL REFERENCES public.qualification_objects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, qualification_object_id)
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_project_qualification_objects_project_id 
ON public.project_qualification_objects(project_id);

CREATE INDEX IF NOT EXISTS idx_project_qualification_objects_qualification_object_id 
ON public.project_qualification_objects(qualification_object_id);


