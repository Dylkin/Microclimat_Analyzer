/*
  # Создание таблицы отчетов испытаний

  1. Новые таблицы
    - `test_reports`
      - `id` (uuid, primary key)
      - `report_number` (text) - номер отчета
      - `report_date` (date) - дата отчета
      - `template_path` (text) - путь к шаблону отчета
      - `object_name` (text) - название объекта исследования
      - `climate_system_name` (text) - название климатической установки
      - `test_type` (text) - вид испытания
      - `temp_min_limit` (numeric) - минимальный лимит температуры
      - `temp_max_limit` (numeric) - максимальный лимит температуры
      - `humidity_min_limit` (numeric) - минимальный лимит влажности
      - `humidity_max_limit` (numeric) - максимальный лимит влажности
      - `test_start_time` (timestamp) - время начала испытания
      - `test_end_time` (timestamp) - время окончания испытания
      - `conclusions` (text) - выводы
      - `pdf_path` (text) - путь к PDF файлу
      - `user_id` (uuid) - исполнитель
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы test_reports
    - Политики для управления отчетами
*/

-- Создание таблицы отчетов испытаний
CREATE TABLE IF NOT EXISTS test_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number text NOT NULL,
  report_date date NOT NULL,
  template_path text,
  object_name text NOT NULL,
  climate_system_name text,
  test_type text NOT NULL,
  temp_min_limit numeric(4,1),
  temp_max_limit numeric(4,1),
  humidity_min_limit numeric(4,1),
  humidity_max_limit numeric(4,1),
  test_start_time timestamptz,
  test_end_time timestamptz,
  conclusions text,
  pdf_path text,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Все пользователи могут читать отчеты"
  ON test_reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Пользователи могут создавать отчеты"
  ON test_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'specialist')
    )
  );

CREATE POLICY "Пользователи могут обновлять свои отчеты"
  ON test_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

CREATE POLICY "Администраторы могут удалять отчеты"
  ON test_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_test_reports_updated_at
  BEFORE UPDATE ON test_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_report_date ON test_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_test_reports_object_name ON test_reports(object_name);