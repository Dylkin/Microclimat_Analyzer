-- Миграция: Добавление поля для связи производителей и поставщиков (один ко многим)
-- Дата: 2025-01-20

-- Добавление поля manufacturer_suppliers для хранения связи производитель -> поставщики в формате JSON
ALTER TABLE public.equipment_sections
ADD COLUMN IF NOT EXISTS manufacturer_suppliers JSONB DEFAULT '[]'::jsonb;

-- Комментарий к колонке
COMMENT ON COLUMN public.equipment_sections.manufacturer_suppliers IS 'Связь производителей и поставщиков в формате JSON: [{"manufacturer": "Название", "supplierIds": ["uuid1", "uuid2"]}, ...]';

-- Создание индекса для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_equipment_sections_manufacturer_suppliers ON public.equipment_sections USING gin(manufacturer_suppliers);


