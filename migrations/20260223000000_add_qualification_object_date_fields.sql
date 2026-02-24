-- Добавление полей "Дата изготовления" и "Срок годности до" для объектов квалификации (термоконтейнер и др.)

ALTER TABLE public.qualification_objects
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE public.project_qualification_object_data
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;
