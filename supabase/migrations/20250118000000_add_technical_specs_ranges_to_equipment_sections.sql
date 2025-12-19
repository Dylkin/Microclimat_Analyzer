-- Миграция: Добавление поля для хранения диапазонов значений технических характеристик
-- Дата: 2025-01-18

-- Добавление поля technical_specs_ranges для хранения диапазонов значений в формате JSON
ALTER TABLE public.equipment_sections
ADD COLUMN IF NOT EXISTS technical_specs_ranges JSONB DEFAULT '{}'::jsonb;

-- Комментарий к колонке
COMMENT ON COLUMN public.equipment_sections.technical_specs_ranges IS 'Диапазоны значений технических характеристик в формате JSON: {"channelsCount": {"enabled": true, "values": ["1", "8", "12"]}, ...}';

-- Создание индекса для оптимизации поиска по техническим характеристикам
CREATE INDEX IF NOT EXISTS idx_equipment_sections_technical_specs_ranges ON public.equipment_sections USING gin(technical_specs_ranges);
