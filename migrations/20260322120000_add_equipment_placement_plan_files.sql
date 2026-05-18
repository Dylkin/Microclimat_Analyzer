-- Отдельная копия плана для схемы размещения измерительного оборудования (отчёт), создаётся при первом открытии редактора.

ALTER TABLE public.qualification_objects
  ADD COLUMN IF NOT EXISTS equipment_placement_plan_file_url TEXT,
  ADD COLUMN IF NOT EXISTS equipment_placement_plan_file_name TEXT;

ALTER TABLE public.project_qualification_object_data
  ADD COLUMN IF NOT EXISTS equipment_placement_plan_file_url TEXT,
  ADD COLUMN IF NOT EXISTS equipment_placement_plan_file_name TEXT;
