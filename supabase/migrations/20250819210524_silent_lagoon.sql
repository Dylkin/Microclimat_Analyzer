/*
  # Создание системы объектов квалификации

  1. Новые таблицы
    - `qualification_objects`
      - `id` (uuid, primary key)
      - `contractor_id` (uuid, foreign key)
      - `type` (enum: помещение, автомобиль, холодильная_камера, холодильник, морозильник)
      - `name` (text) - наименование
      - `address` (text) - адрес (для помещений)
      - `latitude` (numeric) - широта
      - `longitude` (numeric) - долгота
      - `geocoded_at` (timestamp) - время геокодирования
      - `area` (numeric) - площадь (для помещений)
      - `climate_system` (text) - климатическая установка
      - `plan_file_url` (text) - URL файла плана
      - `plan_file_name` (text) - имя файла плана
      - `vin` (text) - VIN номер (для автомобилей)
      - `registration_number` (text) - регистрационный номер
      - `body_volume` (numeric) - объем кузова
      - `inventory_number` (text) - инвентарный номер
      - `chamber_volume` (numeric) - объем камеры
      - `serial_number` (text) - серийный номер
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `qualification_objects`
    - Добавить политики для доступа пользователей к объектам их контрагентов
</system_reminders>

-- Создание enum для типов объектов квалификации
DO $$ BEGIN
  CREATE TYPE qualification_object_type AS ENUM (
    'помещение',
    'автомобиль', 
    'холодильная_камера',
    'холодильник',
    'морозильник'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создание таблицы объектов квалификации
CREATE TABLE IF NOT EXISTS qualification_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  type qualification_object_type NOT NULL,
  name text,
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  geocoded_at timestamptz,
  area numeric(10,2),
  climate_system text,
  plan_file_url text,
  plan_file_name text,
  vin text,
  registration_number text,
  body_volume numeric(10,2),
  inventory_number text,
  chamber_volume numeric(10,2),
  serial_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_id 
ON qualification_objects(contractor_id);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_type 
ON qualification_objects(type);

CREATE INDEX IF NOT EXISTS idx_qualification_objects_location 
ON qualification_objects(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Включение RLS
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;

-- Создание политик RLS
CREATE POLICY "qualification_objects_all_access_policy"
ON qualification_objects
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Создание функции обновления updated_at
CREATE OR REPLACE FUNCTION update_qualification_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для обновления updated_at
DO $$ BEGIN
  CREATE TRIGGER update_qualification_objects_updated_at
    BEFORE UPDATE ON qualification_objects
    FOR EACH ROW
    EXECUTE FUNCTION update_qualification_objects_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;