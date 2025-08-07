export interface ReportData {
  // Основная информация
  reportNo: string;
  reportDate: string;
  nameOfObject: string;
  nameOfAirConditioningSystem: string;
  nameOfTest: string;
  
  // Временные данные
  dateTimeOfTestStart: string;
  dateTimeOfTestCompletion: string;
  durationOfTest: string;
  
  // Критерии и результаты
  acceptanceCriteria: string;
  result: string;
  
  // Исполнители
  executor: string;
  director: string;
  testDate: string;
}

export interface ReportFormData extends ReportData {
  templateFile?: File;
}

export interface AnalysisResult {
  zoneNumber: string | number;
  measurementLevel: string;
  loggerName: string;
  serialNumber: string;
  minTemp: string | number;
  maxTemp: string | number;
  avgTemp: string | number;
  minHumidity?: string | number;
  maxHumidity?: string | number;
  avgHumidity?: string | number;
  meetsLimits: string;
  isExternal?: boolean;
}