export interface DeviceMetadata {
  deviceType: number;
  serialNumber: string;
  deviceModel: string;
  firmwareVersion?: string;
  calibrationDate?: Date;
  measurementInterval: number; // в минутах
}

export interface MeasurementRecord {
  timestamp: Date;
  temperature: number;
  humidity?: number;
  isValid: boolean;
  validationErrors?: string[];
}

export interface ParsedFileData {
  fileName: string;
  deviceMetadata: DeviceMetadata;
  measurements: MeasurementRecord[];
  startDate: Date;
  endDate: Date;
  recordCount: number;
  parsingStatus: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  uploadDate: string;
  parsedData?: ParsedFileData;
  parsingStatus: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  recordCount?: number;
  period?: string;
}