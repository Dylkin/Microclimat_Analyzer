/*
  # Создание таблицы объектов квалификации

  1. Новые типы
    - `object_type` (enum) - типы объектов квалификации
  
  2. Новые таблицы
    - `qualification_objects`
      - `id` (uuid, primary key)
      - `contractor_id` (uuid, foreign key to contractors)
      - `object_type` (object_type enum)
      - `data` (jsonb) - данные объекта в зависимости от типа
      - `plan_file_url` (text) - URL файла плана
      - `plan_file_name` (text) - имя файла плана
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Безопасность
    - Включение RLS на таблице `qualification_objects`
    - Политика полного доступа для публичных пользователей
    
  4. Индексы
    - Индекс по contractor_id
    - Индекс по object_type
    
  5. Триггеры
    - Автоматическое обновление updated_at
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

-- Создание политик RLS (без IF NOT EXISTS)
DO $$ BEGIN
  CREATE POLICY "qualification_objects_all_access_policy"
    ON qualification_objects
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Создание функции для обновления updated_at
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
    FOR EACH ROW EXECUTE FUNCTION update_qualification_objects_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;