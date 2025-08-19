/*
  # Создание таблиц для анализа данных

  1. Новые таблицы
    - `analysis_sessions` - сессии анализа данных
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `description` (text, optional)
      - `file_ids` (uuid array)
      - `data_type` (enum: temperature, humidity)
      - `contract_fields` (jsonb)
      - `conclusions` (text, optional)
      - `created_at`, `updated_at` (timestamps)
    
    - `chart_settings` - настройки графиков
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `data_type` (enum: temperature, humidity)
      - `limits` (jsonb)
      - `zoom_state` (jsonb, optional)
      - `created_at`, `updated_at` (timestamps)
    
    - `vertical_markers` - вертикальные маркеры на графиках
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `timestamp` (timestamptz)
      - `label` (text, optional)
      - `color` (text)
      - `marker_type` (enum: test, door_opening)
      - `created_at` (timestamp)

  2. Безопасность
    - Включить RLS для всех таблиц
    - Политики для доступа пользователей только к своим данным
*/

-- Создание таблицы сессий анализа
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  file_ids uuid[] NOT NULL,
  data_type text CHECK (data_type IN ('temperature', 'humidity')) DEFAULT 'temperature',
  contract_fields jsonb DEFAULT '{}',
  conclusions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы настроек графиков
CREATE TABLE IF NOT EXISTS chart_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  data_type text CHECK (data_type IN ('temperature', 'humidity')) NOT NULL,
  limits jsonb DEFAULT '{}',
  zoom_state jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы вертикальных маркеров
CREATE TABLE IF NOT EXISTS vertical_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  label text,
  color text DEFAULT '#8b5cf6',
  marker_type text CHECK (marker_type IN ('test', 'door_opening')) DEFAULT 'test',
  created_at timestamptz DEFAULT now()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_settings_session_id ON chart_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_vertical_markers_session_id ON vertical_markers(session_id);

-- Включение RLS
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_markers ENABLE ROW LEVEL SECURITY;

-- Политики для analysis_sessions
CREATE POLICY "Users can manage their own analysis sessions"
  ON analysis_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Политики для chart_settings
CREATE POLICY "Users can manage chart settings of their sessions"
  ON chart_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = chart_settings.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = chart_settings.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Политики для vertical_markers
CREATE POLICY "Users can manage markers of their sessions"
  ON vertical_markers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = vertical_markers.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = vertical_markers.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_settings_updated_at
  BEFORE UPDATE ON chart_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();