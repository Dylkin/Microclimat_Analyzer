-- Создание таблиц для разделов и карточек оборудования

-- Таблица разделов оборудования
CREATE TABLE IF NOT EXISTS public.equipment_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица карточек оборудования
CREATE TABLE IF NOT EXISTS public.equipment_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES public.equipment_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  external_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_section_name UNIQUE(section_id, name)
);

-- Создание индексов для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_equipment_sections_name ON public.equipment_sections(name);
CREATE INDEX IF NOT EXISTS idx_equipment_cards_section_id ON public.equipment_cards(section_id);
CREATE INDEX IF NOT EXISTS idx_equipment_cards_name ON public.equipment_cards(name);
CREATE INDEX IF NOT EXISTS idx_equipment_cards_search ON public.equipment_cards USING gin(to_tsvector('russian', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(manufacturer, '') || ' ' || coalesce(model, '')));

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_equipment_sections_updated_at BEFORE UPDATE ON public.equipment_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_cards_updated_at BEFORE UPDATE ON public.equipment_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включение RLS (Row Level Security) - опционально
-- Для обычной PostgreSQL RLS можно отключить или настроить по необходимости
-- ALTER TABLE public.equipment_sections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.equipment_cards ENABLE ROW LEVEL SECURITY;

-- Если используется Supabase, раскомментируйте политики ниже и замените 'authenticated' на нужную роль
-- CREATE POLICY "Users can view equipment sections"
--     ON public.equipment_sections FOR SELECT
--     USING (true);
--
-- CREATE POLICY "Users can insert equipment sections"
--     ON public.equipment_sections FOR INSERT
--     WITH CHECK (true);
--
-- CREATE POLICY "Users can update equipment sections"
--     ON public.equipment_sections FOR UPDATE
--     USING (true)
--     WITH CHECK (true);
--
-- CREATE POLICY "Users can delete equipment sections"
--     ON public.equipment_sections FOR DELETE
--     USING (true);
--
-- CREATE POLICY "Users can view equipment cards"
--     ON public.equipment_cards FOR SELECT
--     USING (true);
--
-- CREATE POLICY "Users can insert equipment cards"
--     ON public.equipment_cards FOR INSERT
--     WITH CHECK (true);
--
-- CREATE POLICY "Users can update equipment cards"
--     ON public.equipment_cards FOR UPDATE
--     USING (true)
--     WITH CHECK (true);
--
-- CREATE POLICY "Users can delete equipment cards"
--     ON public.equipment_cards FOR DELETE
--     USING (true);

