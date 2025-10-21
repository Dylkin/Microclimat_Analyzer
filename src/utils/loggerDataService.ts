import { supabase } from './supabaseClient';
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
  private supabase: any = null;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return this.supabase !== null;
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
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

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

      // Сначала сохраняем сводную информацию о файле
      const summaryData: LoggerDataSummary = {
        project_id: projectId,
        qualification_object_id: qualificationObjectId,
        zone_number: zoneNumber,
        measurement_level: measurementLevel,
        logger_name: loggerName,
        file_name: parsedData.fileName,
        device_type: parsedData.deviceMetadata.deviceType,
        device_model: parsedData.deviceMetadata.deviceModel,
        serial_number: parsedData.deviceMetadata.serialNumber,
        start_date: parsedData.startDate,
        end_date: parsedData.endDate,
        record_count: parsedData.recordCount,
        parsing_status: parsedData.parsingStatus,
        error_message: parsedData.errorMessage
      };

      console.log('LoggerDataService: Сохраняем сводную информацию с статусом:', {
        file_name: parsedData.fileName,
        parsing_status: parsedData.parsingStatus,
        record_count: parsedData.recordCount,
        zone_number: zoneNumber,
        measurement_level: measurementLevel
      });

      const { data: summaryResult, error: summaryError } = await this.supabase
        .from('logger_data_summary')
        .insert([summaryData])
        .select()
        .single();

      if (summaryError) {
        console.error('Ошибка сохранения сводной информации:', summaryError);
        throw new Error(`Ошибка сохранения сводной информации: ${summaryError.message}`);
      }

      console.log('Сводная информация сохранена:', summaryResult);

      // Если парсинг завершился успешно, сохраняем детальные данные
      if (parsedData.parsingStatus === 'completed' && parsedData.measurements.length > 0) {
        const batchSize = 1000; // Размер пакета для вставки
        const totalBatches = Math.ceil(parsedData.measurements.length / batchSize);
        
        console.log(`Сохранение ${parsedData.measurements.length} записей в ${totalBatches} пакетах`);

        for (let i = 0; i < totalBatches; i++) {
          const startIndex = i * batchSize;
          const endIndex = Math.min(startIndex + batchSize, parsedData.measurements.length);
          const batch = parsedData.measurements.slice(startIndex, endIndex);

          const batchData: LoggerDataRecord[] = batch.map(measurement => ({
            project_id: projectId,
            qualification_object_id: qualificationObjectId,
            zone_number: zoneNumber,
            measurement_level: measurementLevel,
            logger_name: loggerName,
            file_name: parsedData.fileName,
            device_type: parsedData.deviceMetadata.deviceType,
            device_model: parsedData.deviceMetadata.deviceModel,
            serial_number: parsedData.deviceMetadata.serialNumber,
            timestamp: measurement.timestamp,
            temperature: measurement.temperature,
            humidity: measurement.humidity,
            is_valid: measurement.isValid,
            validation_errors: measurement.validationErrors
          }));

          const { error: batchError } = await this.supabase
            .from('logger_data_records')
            .insert(batchData);

          if (batchError) {
            console.error(`Ошибка сохранения пакета ${i + 1}:`, batchError);
            throw new Error(`Ошибка сохранения пакета ${i + 1}: ${batchError.message}`);
          }

          console.log(`Пакет ${i + 1}/${totalBatches} сохранен (${batch.length} записей)`);
        }
      }

      return {
        success: true,
        recordCount: parsedData.recordCount
      };

    } catch (error) {
      console.error('Ошибка сохранения данных логгера:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение данных логгера для анализа
   */
  async getLoggerData(
    projectId: string,
    qualificationObjectId: string,
    zoneNumber?: number,
    measurementLevel?: number
  ): Promise<LoggerDataRecord[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    let query = this.supabase
      .from('logger_data_records')
      .select('*')
      .eq('project_id', projectId)
      .eq('qualification_object_id', qualificationObjectId)
      .order('timestamp', { ascending: true });

    if (zoneNumber !== undefined) {
      query = query.eq('zone_number', zoneNumber);
    }

    if (measurementLevel !== undefined) {
      query = query.eq('measurement_level', measurementLevel);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Ошибка получения данных логгера: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Получение сводной информации о файлах логгеров
   */
  async getLoggerDataSummary(
    projectId: string,
    qualificationObjectId: string
  ): Promise<LoggerDataSummary[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    console.log('LoggerDataService: запрос к logger_data_summary с параметрами:', { projectId, qualificationObjectId });
    
    const { data, error } = await this.supabase
      .from('logger_data_summary')
      .select('*')
      .eq('project_id', projectId)
      .eq('qualification_object_id', qualificationObjectId)
      .order('created_at', { ascending: false });

    console.log('LoggerDataService: результат запроса:', { data, error });

    if (error) {
      throw new Error(`Ошибка получения сводной информации: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Удаление данных логгера
   */
  async deleteLoggerData(
    projectId: string,
    qualificationObjectId: string,
    fileName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Удаляем детальные записи
      const { error: recordsError } = await this.supabase
        .from('logger_data_records')
        .delete()
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .eq('file_name', fileName);

      if (recordsError) {
        throw new Error(`Ошибка удаления записей: ${recordsError.message}`);
      }

      // Удаляем сводную информацию
      const { error: summaryError } = await this.supabase
        .from('logger_data_summary')
        .delete()
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .eq('file_name', fileName);

      if (summaryError) {
        throw new Error(`Ошибка удаления сводной информации: ${summaryError.message}`);
      }

      return { success: true };

    } catch (error) {
      console.error('Ошибка удаления данных логгера:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
}

export const loggerDataService = new LoggerDataService();

