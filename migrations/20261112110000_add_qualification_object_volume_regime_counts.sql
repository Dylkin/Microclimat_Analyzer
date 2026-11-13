-- «Кол-во объемов» и «Кол-во температурных режимов» для объектов квалификации
-- (используются для типа «автомобиль»; по умолчанию 1 и 1).
-- «Кол-во дней на подготовку документации» пересчитывается как
-- базовые дни × 0,5 × (объемы + режимы).
ALTER TABLE public.qualification_objects
  ADD COLUMN IF NOT EXISTS volumes_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS temperature_regimes_count INTEGER NOT NULL DEFAULT 1;

UPDATE public.qualification_objects
SET volumes_count = 1
WHERE volumes_count IS NULL OR volumes_count < 1;

UPDATE public.qualification_objects
SET temperature_regimes_count = 1
WHERE temperature_regimes_count IS NULL OR temperature_regimes_count < 1;
