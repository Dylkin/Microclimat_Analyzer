/*
  # Создание системы хранения файлов и данных измерений

  1. Новые таблицы
    - `uploaded_files` - информация о загруженных файлах пользователей
    - `device_metadata` - метаданные устройств для каждого файла
    - `measurement_records` - записи измерений из файлов
    - `analysis_sessions` - сессии анализа данных
    - `chart_settings` - настройки графиков для сессий
    - `vertical_markers` - вертикальные маркеры на графиках

  2. Безопасность
    - Включен RLS для всех таблиц
    - Политики доступа только к собственным данным пользователя
    - Каскадное удаление связанных данных

  3. Оптимизация
    - Индексы для быстрого поиска
    - Триггеры для автоматического обновления временных меток
*/

-- Создание таблицы uploaded_files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_name text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  parsing_status text DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'error')),
  error_message text,
  record_count integer DEFAULT 0,
  period_start timestamptz,
  period_end timestamptz,
  zone_number integer,
  measurement_level text,
  file_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы device_metadata
CREATE TABLE IF NOT EXISTS device_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE,
  device_type integer NOT NULL,
  device_model text,
  serial_number text,
  firmware_version text,
  calibration_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы measurement_records
CREATE TABLE IF NOT EXISTS measurement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  temperature numeric(5,2),
  humidity numeric(5,2),
  is_valid boolean DEFAULT true,
  validation_errors text[],
  original_index integer,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы analysis_sessions
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_ids uuid[] NOT NULL,
  data_type text DEFAULT 'temperature' CHECK (data_type IN ('temperature', 'humidity')),
  contract_fields jsonb DEFAULT '{}',
  conclusions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы chart_settings
CREATE TABLE IF NOT EXISTS chart_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
  limits jsonb DEFAULT '{}',
  zoom_state jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы vertical_markers
CREATE TABLE IF NOT EXISTS vertical_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  label text,
  color text DEFAULT '#8b5cf6',
  marker_type text DEFAULT 'test' CHECK (marker_type IN ('test', 'door_opening')),
  created_at timestamptz DEFAULT now()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_parsing_status ON uploaded_files(parsing_status);
CREATE INDEX IF NOT EXISTS idx_device_metadata_file_id ON device_metadata(file_id);
CREATE INDEX IF NOT EXISTS idx_measurement_records_file_id ON measurement_records(file_id);
CREATE INDEX IF NOT EXISTS idx_measurement_records_timestamp ON measurement_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_settings_session_id ON chart_settings(session_id);
CREATE INDEX IF NOT EXISTS idx_vertical_markers_session_id ON vertical_markers(session_id);

-- Включение RLS для всех таблиц
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_markers ENABLE ROW LEVEL SECURITY;

-- Удаление существующих политик (если есть) и создание новых для uploaded_files
DROP POLICY IF EXISTS "user_files_full_access_policy" ON uploaded_files;
CREATE POLICY "user_files_full_access_policy" ON uploaded_files
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Удаление существующих политик (если есть) и создание новых для device_metadata
DROP POLICY IF EXISTS "user_device_metadata_access_policy" ON device_metadata;
CREATE POLICY "user_device_metadata_access_policy" ON device_metadata
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.id = device_metadata.file_id 
      AND uf.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.id = device_metadata.file_id 
      AND uf.user_id = auth.uid()
    )
  );

-- Удаление существующих политик (если есть) и создание новых для measurement_records
DROP POLICY IF EXISTS "user_measurement_records_access_policy" ON measurement_records;
CREATE POLICY "user_measurement_records_access_policy" ON measurement_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.id = measurement_records.file_id 
      AND uf.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.id = measurement_records.file_id 
      AND uf.user_id = auth.uid()
    )
  );

-- Удаление существующих политик (если есть) и создание новых для analysis_sessions
DROP POLICY IF EXISTS "user_analysis_sessions_full_access_policy" ON analysis_sessions;
CREATE POLICY "user_analysis_sessions_full_access_policy" ON analysis_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Удаление существующих политик (если есть) и создание новых для chart_settings
DROP POLICY IF EXISTS "user_chart_settings_access_policy" ON chart_settings;
CREATE POLICY "user_chart_settings_access_policy" ON chart_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions as_table 
      WHERE as_table.id = chart_settings.session_id 
      AND as_table.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions as_table 
      WHERE as_table.id = chart_settings.session_id 
      AND as_table.user_id = auth.uid()
    )
  );

-- Удаление существующих политик (если есть) и создание новых для vertical_markers
DROP POLICY IF EXISTS "user_vertical_markers_access_policy" ON vertical_markers;
CREATE POLICY "user_vertical_markers_access_policy" ON vertical_markers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions as_table 
      WHERE as_table.id = vertical_markers.session_id 
      AND as_table.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions as_table 
      WHERE as_table.id = vertical_markers.session_id 
      AND as_table.user_id = auth.uid()
    )
  );

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON uploaded_files;
CREATE TRIGGER update_uploaded_files_updated_at
  BEFORE UPDATE ON uploaded_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analysis_sessions_updated_at ON analysis_sessions;
CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_settings_updated_at ON chart_settings;
CREATE TRIGGER update_chart_settings_updated_at
  BEFORE UPDATE ON chart_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();