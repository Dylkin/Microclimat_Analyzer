export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'administrator' | 'manager' | 'specialist';
  created_at: string;
  updated_at: string;
}

export interface DataFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  period_start?: string;
  period_end?: string;
  record_count?: number;
  zone_number?: number;
  measurement_level?: string;
  status: 'uploading' | 'processed' | 'error' | 'saved';
  device_type?: number;
  serial_number?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  order_index: number;
}

export interface MeasurementData {
  id: string;
  file_id: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  created_at: string;
}

export interface TestReport {
  id: string;
  report_number: string;
  report_date: string;
  template_path?: string;
  object_name: string;
  climate_system_name?: string;
  test_type: string;
  temp_min_limit?: number;
  temp_max_limit?: number;
  humidity_min_limit?: number;
  humidity_max_limit?: number;
  conclusions?: string;
  pdf_path?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface VerticalLine {
  id: string;
  x: number;
  timestamp: string;
  comment: string;
  color: string;
}

export interface TestInterval {
  start_time?: string;
  end_time?: string;
  duration?: string;
}

export interface StatisticsData {
  min: number;
  max: number;
  average: number;
  compliant: boolean | null;
}

export interface ResultsTableRow {
  zone: number;
  level: string;
  logger_name: string;
  serial_number: string;
  temperature: StatisticsData;
  humidity?: StatisticsData;
}

export const TEST_TYPES = [
  'Соответствие критериям в пустом объекте',
  'Соответствие критериям в загруженном объекте',
  'Открытие двери',
  'Отключение электропитания',
  'Включение электропитания'
] as const;

export type TestType = typeof TEST_TYPES[number];