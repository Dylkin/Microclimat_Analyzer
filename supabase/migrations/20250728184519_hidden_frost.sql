/*
  # Создание таблицы файлов данных

  1. Новые таблицы
    - `data_files`
      - `id` (uuid, primary key)
      - `filename` (text) - имя файла в хранилище
      - `original_filename` (text) - оригинальное имя файла
      - `file_path` (text) - путь к файлу в хранилище
      - `period_start` (timestamp) - начало периода измерений
      - `period_end` (timestamp) - конец периода измерений
      - `record_count` (integer) - количество записей
      - `zone_number` (integer) - номер зоны измерения (1-99)
      - `measurement_level` (text) - уровень измерения
      - `status` (enum) - статус обработки файла
      - `device_type` (integer) - тип устройства (1-Testo174T, 2-Testo174H)
      - `serial_number` (text) - серийный номер логгера
      - `user_id` (uuid) - пользователь, загрузивший файл
      - `order_index` (integer) - порядок отображения
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы data_files
    - Политики для управления файлами согласно ролям
*/

-- Создание типа для статуса файла
CREATE TYPE file_status AS ENUM ('uploading', 'processed', 'error', 'saved');

-- Создание таблицы файлов данных
CREATE TABLE IF NOT EXISTS data_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  record_count integer,
  zone_number integer CHECK (zone_number >= 1 AND zone_number <= 99),
  measurement_level text,
  status file_status NOT NULL DEFAULT 'uploading',
  device_type integer,
  serial_number text,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Пользователи могут читать все файлы"
  ON data_files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Пользователи могут загружать файлы"
  ON data_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'manager', 'specialist')
    )
  );

CREATE POLICY "Пользователи могут обновлять свои файлы"
  ON data_files
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'manager')
    )
  );

CREATE POLICY "Пользователи могут удалять свои файлы"
  ON data_files
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'manager')
    )
  );

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_data_files_updated_at
  BEFORE UPDATE ON data_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_data_files_user_id ON data_files(user_id);
CREATE INDEX IF NOT EXISTS idx_data_files_status ON data_files(status);
CREATE INDEX IF NOT EXISTS idx_data_files_order ON data_files(order_index);
CREATE INDEX IF NOT EXISTS idx_data_files_device_type ON data_files(device_type);