-- Добавление полей в таблицу разделов оборудования
-- Производитель (может быть несколько), Сайт, Поставщик (может быть несколько)

ALTER TABLE public.equipment_sections 
  ADD COLUMN IF NOT EXISTS manufacturers TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS supplier_ids UUID[] DEFAULT '{}';

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_equipment_sections_manufacturers ON public.equipment_sections USING GIN(manufacturers);
CREATE INDEX IF NOT EXISTS idx_equipment_sections_supplier_ids ON public.equipment_sections USING GIN(supplier_ids);

-- Комментарии к колонкам
COMMENT ON COLUMN public.equipment_sections.manufacturers IS 'Массив производителей раздела';
COMMENT ON COLUMN public.equipment_sections.website IS 'Ссылка на сайт производителя';
COMMENT ON COLUMN public.equipment_sections.supplier_ids IS 'Массив ID поставщиков из справочника контрагентов с признаком Поставщик';



