-- «Кол-во дней на подготовку документации» для объектов квалификации (все типы).
-- Значение по умолчанию — 3 дня; сумма по выбранным объектам подставляется
-- в одноимённое поле расчёта на странице «Проекты».
ALTER TABLE public.qualification_objects
  ADD COLUMN IF NOT EXISTS documentation_preparation_days NUMERIC(6, 1) NOT NULL DEFAULT 3;

UPDATE public.qualification_objects
SET documentation_preparation_days = 3
WHERE documentation_preparation_days IS NULL;
