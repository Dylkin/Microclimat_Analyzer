/*
  # Система анализа файлов - полная структура данных

  1. Новые таблицы
    - `analysis_sessions` - сессии анализа данных
    - `chart_settings` - настройки графиков для каждой сессии
    - `vertical_markers` - вертикальные маркеры на графиках
    - `file_analysis_cache` - кэш результатов анализа файлов

  2. Обновления существующих таблиц
    - Добавление недостающих полей в `uploaded_files`
    - Обновление индексов для оптимизации

  3. Безопасность
    - Удаление существующих политик перед созданием новых
    - Создание новых RLS политик с уникальными именами
    - Настройка каскадного удаления
*/

-- Проверяем и создаем таблицу analysis_sessions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analysis_sessions') THEN
    CREATE TABLE analysis_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      file_ids uuid[] NOT NULL DEFAULT '{}',
      data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
      contract_fields jsonb DEFAULT '{}',
      conclusions text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Создаем индексы
    CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);
    CREATE INDEX idx_analysis_sessions_data_type ON analysis_sessions(data_type);
    CREATE INDEX idx_analysis_sessions_created_at ON analysis_sessions(created_at DESC);

    -- Включаем RLS
    ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

    -- Удаляем существующие политики если они есть
    DROP POLICY IF EXISTS "analysis_sessions_user_access" ON analysis_sessions;
    DROP POLICY IF EXISTS "Users can manage their own analysis sessions" ON analysis_sessions;

    -- Создаем новые политики
    CREATE POLICY "analysis_sessions_full_user_access" ON analysis_sessions
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Триггер для обновления updated_at
    CREATE OR REPLACE FUNCTION update_analysis_sessions_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_analysis_sessions_updated_at
      BEFORE UPDATE ON analysis_sessions
      FOR EACH ROW EXECUTE FUNCTION update_analysis_sessions_updated_at();
  END IF;
END $$;

-- Проверяем и создаем таблицу chart_settings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chart_settings') THEN
    CREATE TABLE chart_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
      data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
      limits jsonb DEFAULT '{}',
      zoom_state jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(session_id, data_type)
    );

    -- Создаем индексы
    CREATE INDEX idx_chart_settings_session_id ON chart_settings(session_id);
    CREATE INDEX idx_chart_settings_data_type ON chart_settings(data_type);

    -- Включаем RLS
    ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;

    -- Удаляем существующие политики если они есть
    DROP POLICY IF EXISTS "chart_settings_user_access" ON chart_settings;
    DROP POLICY IF EXISTS "Users can manage chart settings of their sessions" ON chart_settings;

    -- Создаем новые политики
    CREATE POLICY "chart_settings_session_owner_access" ON chart_settings
      FOR ALL TO authenticated
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

    -- Триггер для обновления updated_at
    CREATE OR REPLACE FUNCTION update_chart_settings_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_chart_settings_updated_at
      BEFORE UPDATE ON chart_settings
      FOR EACH ROW EXECUTE FUNCTION update_chart_settings_updated_at();
  END IF;
END $$;

-- Проверяем и создаем таблицу vertical_markers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vertical_markers') THEN
    CREATE TABLE vertical_markers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
      timestamp timestamptz NOT NULL,
      label text,
      color text DEFAULT '#8b5cf6',
      marker_type text DEFAULT 'test' CHECK (marker_type IN ('test', 'door_opening')),
      created_at timestamptz DEFAULT now()
    );

    -- Создаем индексы
    CREATE INDEX idx_vertical_markers_session_id ON vertical_markers(session_id);
    CREATE INDEX idx_vertical_markers_timestamp ON vertical_markers(timestamp);

    -- Включаем RLS
    ALTER TABLE vertical_markers ENABLE ROW LEVEL SECURITY;

    -- Удаляем существующие политики если они есть
    DROP POLICY IF EXISTS "vertical_markers_user_access" ON vertical_markers;
    DROP POLICY IF EXISTS "Users can manage markers of their sessions" ON vertical_markers;

    -- Создаем новые политики
    CREATE POLICY "vertical_markers_session_owner_access" ON vertical_markers
      FOR ALL TO authenticated
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
  END IF;
END $$;

-- Проверяем и создаем таблицу file_analysis_cache
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_analysis_cache') THEN
    CREATE TABLE file_analysis_cache (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE,
      data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
      min_value numeric(8,2),
      max_value numeric(8,2),
      avg_value numeric(8,2),
      record_count integer DEFAULT 0,
      time_range_start timestamptz,
      time_range_end timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(file_id, data_type)
    );

    -- Создаем индексы
    CREATE INDEX idx_file_analysis_cache_file_id ON file_analysis_cache(file_id);
    CREATE INDEX idx_file_analysis_cache_data_type ON file_analysis_cache(data_type);

    -- Включаем RLS
    ALTER TABLE file_analysis_cache ENABLE ROW LEVEL SECURITY;

    -- Удаляем существующие политики если они есть
    DROP POLICY IF EXISTS "file_analysis_cache_user_access" ON file_analysis_cache;

    -- Создаем новые политики
    CREATE POLICY "file_analysis_cache_file_owner_access" ON file_analysis_cache
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM uploaded_files 
          WHERE uploaded_files.id = file_analysis_cache.file_id 
          AND uploaded_files.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM uploaded_files 
          WHERE uploaded_files.id = file_analysis_cache.file_id 
          AND uploaded_files.user_id = auth.uid()
        )
      );

    -- Триггер для обновления updated_at
    CREATE OR REPLACE FUNCTION update_file_analysis_cache_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_file_analysis_cache_updated_at
      BEFORE UPDATE ON file_analysis_cache
      FOR EACH ROW EXECUTE FUNCTION update_file_analysis_cache_updated_at();
  END IF;
END $$;

-- Обновляем существующие таблицы если нужно
DO $$ 
BEGIN
  -- Проверяем и добавляем недостающие поля в uploaded_files
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'uploaded_files' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE uploaded_files ADD COLUMN file_size bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'uploaded_files' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE uploaded_files ADD COLUMN file_hash text;
  END IF;

  -- Обновляем политики для uploaded_files если нужно
  DROP POLICY IF EXISTS "uploaded_files_user_access" ON uploaded_files;
  DROP POLICY IF EXISTS "Users can manage their own files" ON uploaded_files;

  CREATE POLICY "uploaded_files_owner_full_access" ON uploaded_files
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- Обновляем политики для measurement_records если нужно
  DROP POLICY IF EXISTS "measurement_records_user_access" ON measurement_records;
  DROP POLICY IF EXISTS "Users can access measurements of their files" ON measurement_records;

  CREATE POLICY "measurement_records_file_owner_access" ON measurement_records
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM uploaded_files 
        WHERE uploaded_files.id = measurement_records.file_id 
        AND uploaded_files.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM uploaded_files 
        WHERE uploaded_files.id = measurement_records.file_id 
        AND uploaded_files.user_id = auth.uid()
      )
    );

  -- Обновляем политики для device_metadata если нужно
  DROP POLICY IF EXISTS "device_metadata_user_access" ON device_metadata;
  DROP POLICY IF EXISTS "Users can access metadata of their files" ON device_metadata;

  CREATE POLICY "device_metadata_file_owner_access" ON device_metadata
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM uploaded_files 
        WHERE uploaded_files.id = device_metadata.file_id 
        AND uploaded_files.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM uploaded_files 
        WHERE uploaded_files.id = device_metadata.file_id 
        AND uploaded_files.user_id = auth.uid()
      )
    );
END $$;