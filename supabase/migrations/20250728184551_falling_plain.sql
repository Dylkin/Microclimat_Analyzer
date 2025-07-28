/*
  # Создание таблицы вертикальных линий

  1. Новые таблицы
    - `vertical_lines`
      - `id` (uuid, primary key)
      - `report_id` (uuid) - ссылка на отчет
      - `x_position` (numeric) - позиция по оси X
      - `timestamp` (timestamp) - временная метка
      - `comment` (text) - комментарий к линии
      - `color` (text) - цвет линии
      - `created_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы vertical_lines
    - Политики для управления вертикальными линиями
*/

-- Создание таблицы вертикальных линий
CREATE TABLE IF NOT EXISTS vertical_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES test_reports(id) ON DELETE CASCADE,
  x_position numeric NOT NULL,
  timestamp timestamptz NOT NULL,
  comment text DEFAULT '',
  color text DEFAULT '#ef4444',
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE vertical_lines ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Пользователи могут читать вертикальные линии"
  ON vertical_lines
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Пользователи могут управлять вертикальными линиями"
  ON vertical_lines
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_reports tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = vertical_lines.report_id
      AND (u.id = auth.uid() OR u.role = 'administrator')
    )
  );

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_vertical_lines_report_id ON vertical_lines(report_id);
CREATE INDEX IF NOT EXISTS idx_vertical_lines_timestamp ON vertical_lines(timestamp);