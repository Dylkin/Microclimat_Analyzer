export interface TimeSeriesPoint {
  timestamp: number;
  temperature?: number;
  humidity?: number;
  fileId: string;
  originalIndex: number;
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

export interface VerticalMarker {
  id: string;
  timestamp: number;
  label?: string;
  color?: string;
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
  temperature?: number;
  humidity?: number;
  visible: boolean;
}

export type DataType = 'temperature' | 'humidity';