/*
  # Создание таблицы данных измерений

  1. Новые таблицы
    - `measurement_data`
      - `id` (uuid, primary key)
      - `file_id` (uuid) - ссылка на файл данных
      - `timestamp` (timestamp) - время измерения
      - `temperature` (numeric) - значение температуры
      - `humidity` (numeric) - значение влажности
      - `created_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы measurement_data
    - Политики для чтения данных измерений

  3. Ограничения
    - Валидация диапазонов температуры (-20 до +70°C)
    - Валидация диапазонов влажности (0 до 100%)
*/

-- Создание таблицы данных измерений
CREATE TABLE IF NOT EXISTS measurement_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES data_files(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  temperature numeric(4,1) CHECK (temperature >= -20.0 AND temperature <= 70.0),
  humidity numeric(4,1) CHECK (humidity >= 0.0 AND humidity <= 100.0),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE measurement_data ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Пользователи могут читать данные измерений"
  ON measurement_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Система может добавлять данные измерений"
  ON measurement_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_measurement_data_file_id ON measurement_data(file_id);
CREATE INDEX IF NOT EXISTS idx_measurement_data_timestamp ON measurement_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_measurement_data_file_timestamp ON measurement_data(file_id, timestamp);