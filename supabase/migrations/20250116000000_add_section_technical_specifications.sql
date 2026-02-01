-- Добавление полей технических характеристик в таблицу equipment_sections

ALTER TABLE public.equipment_sections
ADD COLUMN IF NOT EXISTS channels_count INTEGER,
ADD COLUMN IF NOT EXISTS dosing_volume TEXT,
ADD COLUMN IF NOT EXISTS volume_step TEXT,
ADD COLUMN IF NOT EXISTS dosing_accuracy TEXT,
ADD COLUMN IF NOT EXISTS reproducibility TEXT,
ADD COLUMN IF NOT EXISTS autoclavable BOOLEAN,
ADD COLUMN IF NOT EXISTS in_registry_si BOOLEAN DEFAULT false;

-- Комментарии к колонкам
COMMENT ON COLUMN public.equipment_sections.channels_count IS 'Количество каналов';
COMMENT ON COLUMN public.equipment_sections.dosing_volume IS 'Объем дозирования';
COMMENT ON COLUMN public.equipment_sections.volume_step IS 'Шаг установки объема дозы';
COMMENT ON COLUMN public.equipment_sections.dosing_accuracy IS 'Точность дозирования';
COMMENT ON COLUMN public.equipment_sections.reproducibility IS 'Воспроизводимость';
COMMENT ON COLUMN public.equipment_sections.autoclavable IS 'Автоклавируемость';
COMMENT ON COLUMN public.equipment_sections.in_registry_si IS 'Наличие в реестре СИ';
