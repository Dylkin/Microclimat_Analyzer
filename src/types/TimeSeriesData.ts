export interface TimeSeriesPoint {
  timestamp: number;
  temperature?: number;
  humidity?: number;
  fileId: string;
  originalIndex: number;
  zoneNumber?: number;
  measurementLevel?: number;
  deviceSerialNumber?: string;
  serialNumber?: string; // Серийный номер из справочника оборудования
  loggerName?: string;
}

export interface ProcessedTimeSeriesData {
  points: TimeSeriesPoint[];
  temperatureRange: [number, number];
  humidityRange: [number, number];
  timeRange: [number, number];
  hasTemperature: boolean;
  hasHumidity: boolean;
}

export interface ChartLimits {
  temperature?: {
    min?: number;
    max?: number;
  };
  humidity?: {
    min?: number;
    max?: number;
  };
}

export type MarkerType = 'test' | 'door_opening';

export interface VerticalMarker {
  id: string;
  timestamp: number;
  label?: string;
  color?: string;
  type: MarkerType;
}

export interface ZoomState {
  startTime: number;
  endTime: number;
  scale: number;
}

export interface TooltipData {
  x: number;
  y: number;
  timestamp: number;
  fileName?: string;
  temperature?: number;
  humidity?: number;
  visible: boolean;
}

export type DataType = 'temperature' | 'humidity';