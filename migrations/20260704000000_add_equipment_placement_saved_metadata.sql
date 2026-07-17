-- Метаданные последнего сохранения расстановки оборудования (дата и исполнитель)

ALTER TABLE public.qualification_objects
  ADD COLUMN IF NOT EXISTS equipment_placement_saved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS equipment_placement_saved_by TEXT;

ALTER TABLE public.project_qualification_object_data
  ADD COLUMN IF NOT EXISTS equipment_placement_saved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS equipment_placement_saved_by TEXT;
