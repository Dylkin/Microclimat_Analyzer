import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
export interface DatabaseUploadedFile {
  id: string;
  user_id: string;
  name: string;
  original_name: string;
  upload_date: string;
  parsing_status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  record_count: number;
  period_start?: string;
  period_end?: string;
  zone_number?: number;
  measurement_level?: string;
  file_order: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDeviceMetadata {
  id: string;
  file_id: string;
  device_type: number;
  device_model?: string;
  serial_number?: string;
  firmware_version?: string;
  calibration_date?: string;
  created_at: string;
}

export interface DatabaseMeasurementRecord {
  id: string;
  file_id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  is_valid: boolean;
  validation_errors?: string[];
  original_index?: number;
  created_at: string;
}

export interface DatabaseAnalysisSession {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_ids: string[];
  data_type: 'temperature' | 'humidity';
  contract_fields: Record<string, any>;
  conclusions?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseChartSettings {
  id: string;
  session_id: string;
  data_type: 'temperature' | 'humidity';
  limits: Record<string, any>;
  zoom_state?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseVerticalMarker {
  id: string;
  session_id: string;
  timestamp: string;
  label?: string;
  color: string;
  marker_type: 'test' | 'door_opening';
  created_at: string;
}