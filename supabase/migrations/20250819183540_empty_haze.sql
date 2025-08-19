/*
  # Создание таблиц для анализа данных

  1. Новые таблицы
    - `analysis_sessions` - сессии анализа данных
    - `chart_settings` - настройки графиков
    - `vertical_markers` - вертикальные маркеры

  2. Безопасность
    - Включен RLS для всех таблиц
    - Политики для доступа пользователей к своим данным
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
  data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
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

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_settings_session_id ON chart_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_vertical_markers_session_id ON vertical_markers(session_id);

-- Включение RLS
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_markers ENABLE ROW LEVEL SECURITY;

-- Создание политик для analysis_sessions (с проверкой существования)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_sessions' 
    AND policyname = 'Users can manage their own analysis sessions'
  ) THEN
    CREATE POLICY "Users can manage their own analysis sessions"
      ON analysis_sessions
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Создание политик для chart_settings (с проверкой существования)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chart_settings' 
    AND policyname = 'Users can manage chart settings of their sessions'
  ) THEN
    CREATE POLICY "Users can manage chart settings of their sessions"
      ON chart_settings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM analysis_sessions 
          WHERE id = chart_settings.session_id 
          AND user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM analysis_sessions 
          WHERE id = chart_settings.session_id 
          AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Создание политик для vertical_markers (с проверкой существования)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vertical_markers' 
    AND policyname = 'Users can manage markers of their sessions'
  ) THEN
    CREATE POLICY "Users can manage markers of their sessions"
      ON vertical_markers
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM analysis_sessions 
          WHERE id = vertical_markers.session_id 
          AND user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM analysis_sessions 
          WHERE id = vertical_markers.session_id 
          AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Создание триггеров для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для analysis_sessions
DROP TRIGGER IF EXISTS update_analysis_sessions_updated_at ON analysis_sessions;
CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для chart_settings
DROP TRIGGER IF EXISTS update_chart_settings_updated_at ON chart_settings;
CREATE TRIGGER update_chart_settings_updated_at
  BEFORE UPDATE ON chart_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();