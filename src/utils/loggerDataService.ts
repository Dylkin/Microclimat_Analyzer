import { apiClient } from './apiClient';
import { ParsedFileData, MeasurementRecord } from '../types/FileData';

interface LoggerDataRecord {
  id?: string;
  project_id: string;
  qualification_object_id: string;
  zone_number: number;
  measurement_level: number;
  logger_name: string;
  file_name: string;
  device_type: number;
  device_model: string;
  serial_number: string;
  timestamp: Date;
  temperature: number;
  humidity?: number;
  is_valid: boolean;
  validation_errors?: string[];
  created_at?: Date;
}

interface LoggerDataSummary {
  id?: string;
  project_id: string;
  qualification_object_id: string;
  zone_number: number;
  measurement_level: number;
  logger_name: string;
  file_name: string;
  device_type: number;
  device_model: string;
  serial_number: string;
  start_date: Date;
  end_date: Date;
  record_count: number;
  parsing_status: 'processing' | 'completed' | 'error';
  error_message?: string;
  created_at?: Date;
}

class LoggerDataService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  /**
   * Сохранение данных логгера в базу данных
   */
  async saveLoggerData(
    projectId: string,
    qualificationObjectId: string,
    zoneNumber: number,
    measurementLevel: number,
    loggerName: string,
    parsedData: ParsedFileData
  ): Promise<{ success: boolean; error?: string; recordCount?: number }> {
    try {
      console.log('Сохранение данных логгера:', {
        projectId,
        qualificationObjectId,
        zoneNumber,
        measurementLevel,
        loggerName,
        fileName: parsedData.fileName,
        recordCount: parsedData.recordCount
      });

      const result = await apiClient.post<{ success: boolean; error?: string; recordCount?: number }>('/logger-data/save', {
        projectId,
        qualificationObjectId,
        zoneNumber,
        measurementLevel,
        loggerName,
        parsedData: {
          fileName: parsedData.fileName,
          deviceMetadata: parsedData.deviceMetadata,
          startDate: parsedData.startDate,
          endDate: parsedData.endDate,
          recordCount: parsedData.recordCount,
          parsingStatus: parsedData.parsingStatus,
          errorMessage: parsedData.errorMessage,
          measurements: parsedData.measurements
        }
      });

      return result;
    } catch (error: any) {
      console.error('Ошибка сохранения данных логгера:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение данных логгера для анализа
   */
  async getLoggerData(
    projectId: string,
    qualificationObjectId: string,
    zoneNumber?: number | null,
    measurementLevel?: number | null
  ): Promise<LoggerDataRecord[]> {
    try {
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      params.append('qualification_object_id', qualificationObjectId);
      if (zoneNumber !== undefined && zoneNumber !== null) {
        params.append('zone_number', zoneNumber.toString());
      }
      if (measurementLevel !== undefined && measurementLevel !== null) {
        params.append('measurement_level', measurementLevel.toString());
      }

      const data = await apiClient.get<LoggerDataRecord[]>(`/logger-data?${params.toString()}`);
      return data || [];
    } catch (error: any) {
      throw new Error(`Ошибка получения данных логгера: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получение сводной информации о файлах логгеров
   */
  async getLoggerDataSummary(
    projectId: string,
    qualificationObjectId: string
  ): Promise<LoggerDataSummary[]> {
    try {
      console.log('LoggerDataService: запрос к logger_data_summary с параметрами:', { projectId, qualificationObjectId });
      
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      params.append('qualification_object_id', qualificationObjectId);

      const data = await apiClient.get<LoggerDataSummary[]>(`/logger-data/summary?${params.toString()}`);
      
      console.log('LoggerDataService: результат запроса:', { count: data?.length || 0 });
      return data || [];
    } catch (error: any) {
      throw new Error(`Ошибка получения сводной информации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Удаление данных логгера
   */
  async deleteLoggerData(
    projectId: string,
    qualificationObjectId: string,
    fileName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('project_id', projectId);
      params.append('qualification_object_id', qualificationObjectId);
      params.append('file_name', fileName);

      const result = await apiClient.delete<{ success: boolean; error?: string }>(`/logger-data?${params.toString()}`);
      return result;
    } catch (error: any) {
      console.error('Ошибка удаления данных логгера:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }
}

export const loggerDataService = new LoggerDataService();

