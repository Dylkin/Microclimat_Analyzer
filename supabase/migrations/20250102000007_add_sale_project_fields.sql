-- Миграция: Добавление полей для проектов типа "Продажа"
-- Дата: 2025-01-02

-- Добавление полей tender_link и tender_date в таблицу projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS tender_link TEXT,
ADD COLUMN IF NOT EXISTS tender_date DATE;

-- Комментарии к колонкам
COMMENT ON COLUMN public.projects.tender_link IS 'Ссылка на объявленную закупку';
COMMENT ON COLUMN public.projects.tender_date IS 'Дата тендера';

-- Обновление типа project_type для добавления 'sale'
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type' AND typtype = 'e') THEN
    CREATE TYPE project_type AS ENUM ('qualification', 'other');
  END IF;
  
  -- Добавляем 'sale' в enum, если его еще нет
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'sale' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type')
  ) THEN
    ALTER TYPE project_type ADD VALUE 'sale';
  END IF;
END $$;

-- Создание таблицы для товаров проекта
CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  declared_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  supplier_price NUMERIC(12, 2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_project_items_project_id ON public.project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_supplier_id ON public.project_items(supplier_id);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.project_items IS 'Товары проекта';
COMMENT ON COLUMN public.project_items.name IS 'Наименование товара';
COMMENT ON COLUMN public.project_items.quantity IS 'Количество (шт.)';
COMMENT ON COLUMN public.project_items.declared_price IS 'Заявленная стоимость';
COMMENT ON COLUMN public.project_items.supplier_id IS 'ID поставщика (контрагент с ролью supplier)';
COMMENT ON COLUMN public.project_items.supplier_price IS 'Стоимость поставщика';



