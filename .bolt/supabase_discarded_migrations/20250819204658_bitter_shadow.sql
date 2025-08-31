/*
  # Создание системы объектов квалификации

  1. Новые таблицы
    - `qualification_objects` - основная таблица объектов квалификации
      - `id` (uuid, primary key)
      - `contractor_id` (uuid, foreign key)
      - `object_type` (enum: помещение, автомобиль, холодильная_камера, холодильник, морозильник)
      - `data` (jsonb) - специфичные данные для каждого типа объекта
      - `plan_file_url` (text) - URL загруженного плана (для типов, которые его поддерживают)
      - `plan_file_name` (text) - оригинальное имя файла плана
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `qualification_objects`
    - Добавить политики для доступа к объектам квалификации
*/

-- Создание enum для типов объектов квалификации
DO $$ BEGIN
  CREATE TYPE object_type AS ENUM (
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
  object_type object_type NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  plan_file_url text,
  plan_file_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_qualification_objects_contractor_id 
  ON qualification_objects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_qualification_objects_type 
  ON qualification_objects(object_type);

-- Включение RLS
ALTER TABLE qualification_objects ENABLE ROW LEVEL SECURITY;

-- Создание политик RLS
CREATE POLICY IF NOT EXISTS "qualification_objects_all_access_policy"
  ON qualification_objects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_qualification_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_qualification_objects_updated_at
    BEFORE UPDATE ON qualification_objects
    FOR EACH ROW EXECUTE FUNCTION update_qualification_objects_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;