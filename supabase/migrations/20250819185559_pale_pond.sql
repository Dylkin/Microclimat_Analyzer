/*
  # Complete File Storage System Migration

  This migration creates a comprehensive file storage and analysis system for the microclimate analyzer application.

  ## 1. New Tables
    - `uploaded_files` - Stores information about uploaded data files
    - `device_metadata` - Stores device information extracted from files  
    - `measurement_records` - Stores individual measurement records from files
    - `analysis_sessions` - Stores analysis session configurations
    - `chart_settings` - Stores chart display settings for sessions
    - `vertical_markers` - Stores vertical markers placed on charts

  ## 2. Security
    - Enable RLS on all new tables
    - Create user-specific access policies for data isolation
    - Ensure users can only access their own data

  ## 3. Performance
    - Add indexes for efficient querying
    - Implement batch operations for large datasets
    - Optimize for time-series data access patterns
*/

-- Create uploaded_files table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uploaded_files') THEN
    CREATE TABLE uploaded_files (
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

    -- Create indexes
    CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
    CREATE INDEX idx_uploaded_files_parsing_status ON uploaded_files(parsing_status);

    -- Enable RLS
    ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
    DROP POLICY IF EXISTS "user_files_full_access_policy" ON uploaded_files;
    CREATE POLICY "user_files_full_access_policy" ON uploaded_files
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Create trigger for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_uploaded_files_updated_at
      BEFORE UPDATE ON uploaded_files
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create device_metadata table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_metadata') THEN
    CREATE TABLE device_metadata (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE,
      device_type integer NOT NULL,
      device_model text,
      serial_number text,
      firmware_version text,
      calibration_date timestamptz,
      created_at timestamptz DEFAULT now()
    );

    -- Create indexes
    CREATE INDEX idx_device_metadata_file_id ON device_metadata(file_id);

    -- Enable RLS
    ALTER TABLE device_metadata ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
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
  END IF;
END $$;

-- Create measurement_records table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'measurement_records') THEN
    CREATE TABLE measurement_records (
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

    -- Create indexes
    CREATE INDEX idx_measurement_records_file_id ON measurement_records(file_id);
    CREATE INDEX idx_measurement_records_timestamp ON measurement_records(timestamp);

    -- Enable RLS
    ALTER TABLE measurement_records ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
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
  END IF;
END $$;

-- Create analysis_sessions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analysis_sessions') THEN
    CREATE TABLE analysis_sessions (
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

    -- Create indexes
    CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);

    -- Enable RLS
    ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
    DROP POLICY IF EXISTS "user_analysis_sessions_full_access_policy" ON analysis_sessions;
    CREATE POLICY "user_analysis_sessions_full_access_policy" ON analysis_sessions
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Create trigger for updated_at
    CREATE TRIGGER update_analysis_sessions_updated_at
      BEFORE UPDATE ON analysis_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create chart_settings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chart_settings') THEN
    CREATE TABLE chart_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
      data_type text NOT NULL CHECK (data_type IN ('temperature', 'humidity')),
      limits jsonb DEFAULT '{}',
      zoom_state jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Create indexes
    CREATE INDEX idx_chart_settings_session_id ON chart_settings(session_id);

    -- Enable RLS
    ALTER TABLE chart_settings ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
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

    -- Create trigger for updated_at
    CREATE TRIGGER update_chart_settings_updated_at
      BEFORE UPDATE ON chart_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create vertical_markers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vertical_markers') THEN
    CREATE TABLE vertical_markers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES analysis_sessions(id) ON DELETE CASCADE,
      timestamp timestamptz NOT NULL,
      label text,
      color text DEFAULT '#8b5cf6',
      marker_type text DEFAULT 'test' CHECK (marker_type IN ('test', 'door_opening')),
      created_at timestamptz DEFAULT now()
    );

    -- Create indexes
    CREATE INDEX idx_vertical_markers_session_id ON vertical_markers(session_id);

    -- Enable RLS
    ALTER TABLE vertical_markers ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists and create new one
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
  END IF;
END $$;