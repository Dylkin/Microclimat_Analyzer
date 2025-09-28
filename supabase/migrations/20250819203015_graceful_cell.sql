/*
  # Создание справочника контрагентов

  1. Новые таблицы
    - `contractors` - основная информация о контрагентах
      - `id` (uuid, primary key)
      - `name` (text) - наименование
      - `address` (text) - адрес
      - `latitude` (numeric) - широта для карты
      - `longitude` (numeric) - долгота для карты
      - `geocoded_at` (timestamp) - время последнего геокодирования
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contractor_contacts` - контакты контрагентов
      - `id` (uuid, primary key)
      - `contractor_id` (uuid, foreign key)
      - `employee_name` (text) - имя сотрудника
      - `phone` (text) - телефон
      - `comment` (text) - комментарий
      - `created_at` (timestamp)

  2. Безопасность
    - Включить RLS для обеих таблиц
    - Разрешить все операции для аутентифицированных пользователей
*/

-- Создание таблицы контрагентов
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  geocoded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы контактов контрагентов
CREATE TABLE IF NOT EXISTS contractor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  phone text,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_contractors_name ON contractors(name);
CREATE INDEX IF NOT EXISTS idx_contractors_location ON contractors(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_contacts_contractor_id ON contractor_contacts(contractor_id);

-- Включение RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_contacts ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности (упрощенные для начала)
DO $$ 
BEGIN
  -- Политики для contractors
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contractors' AND policyname = 'contractors_all_access_policy'
  ) THEN
    CREATE POLICY "contractors_all_access_policy"
      ON contractors
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Политики для contractor_contacts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contractor_contacts' AND policyname = 'contractor_contacts_all_access_policy'
  ) THEN
    CREATE POLICY "contractor_contacts_all_access_policy"
      ON contractor_contacts
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Создание функции обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для contractors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_contractors_updated_at'
  ) THEN
    CREATE TRIGGER update_contractors_updated_at
      BEFORE UPDATE ON contractors
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;