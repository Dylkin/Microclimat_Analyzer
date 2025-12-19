-- Миграция: Добавление полей технических характеристик и категории в таблицу project_items
-- Дата: 2025-01-17

-- Добавление полей для категории и технических характеристик
ALTER TABLE public.project_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.equipment_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS channels_count INTEGER,
ADD COLUMN IF NOT EXISTS dosing_volume TEXT,
ADD COLUMN IF NOT EXISTS volume_step TEXT,
ADD COLUMN IF NOT EXISTS dosing_accuracy TEXT,
ADD COLUMN IF NOT EXISTS reproducibility TEXT,
ADD COLUMN IF NOT EXISTS autoclavable BOOLEAN,
ADD COLUMN IF NOT EXISTS in_registry_si BOOLEAN DEFAULT FALSE;

-- Комментарии к колонкам
COMMENT ON COLUMN public.project_items.category_id IS 'ID категории товара (equipment_sections)';
COMMENT ON COLUMN public.project_items.channels_count IS 'Количество каналов';
COMMENT ON COLUMN public.project_items.dosing_volume IS 'Объем дозирования';
COMMENT ON COLUMN public.project_items.volume_step IS 'Шаг установки объема дозы';
COMMENT ON COLUMN public.project_items.dosing_accuracy IS 'Точность дозирования';
COMMENT ON COLUMN public.project_items.reproducibility IS 'Воспроизводимость';
COMMENT ON COLUMN public.project_items.autoclavable IS 'Автоклавируемость';
COMMENT ON COLUMN public.project_items.in_registry_si IS 'Наличие в реестре СИ';

-- Создание индекса для category_id
CREATE INDEX IF NOT EXISTS idx_project_items_category_id ON public.project_items(category_id);
