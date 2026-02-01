-- Добавление новых полей в таблицу карточек оборудования

-- Переименование поля model в series
ALTER TABLE public.equipment_cards RENAME COLUMN model TO series;

-- Добавление новых полей
ALTER TABLE public.equipment_cards 
  ADD COLUMN IF NOT EXISTS channels_count INTEGER,
  ADD COLUMN IF NOT EXISTS dosing_volume TEXT,
  ADD COLUMN IF NOT EXISTS volume_step TEXT,
  ADD COLUMN IF NOT EXISTS dosing_accuracy TEXT,
  ADD COLUMN IF NOT EXISTS reproducibility TEXT,
  ADD COLUMN IF NOT EXISTS autoclavable BOOLEAN;

-- Создание индексов для новых полей
CREATE INDEX IF NOT EXISTS idx_equipment_cards_series ON public.equipment_cards(series);
CREATE INDEX IF NOT EXISTS idx_equipment_cards_channels_count ON public.equipment_cards(channels_count);



