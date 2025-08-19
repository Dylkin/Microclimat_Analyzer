import { supabase, DatabaseUploadedFile, DatabaseDeviceMetadata, DatabaseMeasurementRecord, DatabaseAnalysisSession, DatabaseChartSettings, DatabaseVerticalMarker } from './supabaseClient';
import { ParsedFileData, DeviceMetadata, MeasurementRecord, UploadedFile } from '../types/FileData';
import { ChartLimits, VerticalMarker, ZoomState } from '../types/TimeSeriesData';

/**
 * Сервис для работы с базой данных Supabase
 */
export class SupabaseDatabaseService {
  private static instance: SupabaseDatabaseService;

  static getInstance(): SupabaseDatabaseService {
    if (!SupabaseDatabaseService.instance) {
      SupabaseDatabaseService.instance = new SupabaseDatabaseService();
    }
    return SupabaseDatabaseService.instance;
  }

  /**
   * Получение текущего пользователя
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Сохранение загруженного файла
   */
  async saveUploadedFile(file: Omit<UploadedFile, 'id'> & { userId: string }): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: user.id,
        name: file.name,
        original_name: file.name,
        parsing_status: file.parsingStatus,
        error_message: file.errorMessage,
        record_count: file.recordCount || 0,
        zone_number: file.zoneNumber,
        measurement_level: file.measurementLevel,
        file_order: file.order
      })
      .select()
      .single();

    if (error) throw new Error(`Ошибка сохранения файла: ${error.message}`);
    return data.id;
  }

  /**
   * Обновление статуса файла
   */
  async updateFileStatus(fileId: string, status: 'pending' | 'processing' | 'completed' | 'error', errorMessage?: string) {
    const { error } = await supabase
      .from('uploaded_files')
      .update({
        parsing_status: status,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) throw new Error(`Ошибка обновления статуса файла: ${error.message}`);
  }

  /**
   * Сохранение метаданных устройства
   */
  async saveDeviceMetadata(fileId: string, metadata: DeviceMetadata): Promise<void> {
    const { error } = await supabase
      .from('device_metadata')
      .insert({
        file_id: fileId,
        device_type: metadata.deviceType,
        device_model: metadata.deviceModel,
        serial_number: metadata.serialNumber,
        firmware_version: metadata.firmwareVersion,
        calibration_date: metadata.calibrationDate?.toISOString()
      });

    if (error) throw new Error(`Ошибка сохранения метаданных устройства: ${error.message}`);
  }

  /**
   * Сохранение записей измерений батчами
   */
  async saveMeasurements(fileId: string, measurements: MeasurementRecord[]): Promise<void> {
    const batchSize = 1000; // Сохраняем по 1000 записей за раз
    
    for (let i = 0; i < measurements.length; i += batchSize) {
      const batch = measurements.slice(i, i + batchSize);
      const records = batch.map((measurement, index) => ({
        file_id: fileId,
        timestamp: measurement.timestamp.toISOString(),
        temperature: measurement.temperature,
        humidity: measurement.humidity,
        is_valid: measurement.isValid,
        validation_errors: measurement.validationErrors,
        original_index: i + index
      }));

      const { error } = await supabase
        .from('measurement_records')
        .insert(records);

      if (error) throw new Error(`Ошибка сохранения измерений: ${error.message}`);
    }
  }

  /**
   * Сохранение полных данных файла
   */
  async saveParsedFileData(fileId: string, parsedData: ParsedFileData): Promise<void> {
    try {
      // Сохраняем метаданные устройства
      await this.saveDeviceMetadata(fileId, parsedData.deviceMetadata);
      
      // Сохраняем измерения
      await this.saveMeasurements(fileId, parsedData.measurements);
      
      // Обновляем информацию о файле
      const { error } = await supabase
        .from('uploaded_files')
        .update({
          parsing_status: parsedData.parsingStatus,
          error_message: parsedData.errorMessage,
          record_count: parsedData.recordCount,
          period_start: parsedData.startDate.toISOString(),
          period_end: parsedData.endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (error) throw new Error(`Ошибка обновления информации о файле: ${error.message}`);
    } catch (error) {
      // В случае ошибки обновляем статус файла
      await this.updateFileStatus(fileId, 'error', error instanceof Error ? error.message : 'Неизвестная ошибка');
      throw error;
    }
  }

  /**
   * Получение всех файлов пользователя
   */
  async getUserFiles(): Promise<UploadedFile[]> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
      .from('uploaded_files')
      .select(`
        *,
        device_metadata (*)
      `)
      .eq('user_id', user.id)
      .order('file_order', { ascending: true });

    if (error) throw new Error(`Ошибка получения файлов: ${error.message}`);

    return data.map(file => this.mapDatabaseFileToUploadedFile(file));
  }

  /**
   * Получение измерений для файла
   */
  async getMeasurements(fileId: string): Promise<MeasurementRecord[]> {
    const { data, error } = await supabase
      .from('measurement_records')
      .select('*')
      .eq('file_id', fileId)
      .order('original_index', { ascending: true });

    if (error) throw new Error(`Ошибка получения измерений: ${error.message}`);

    return data.map(record => ({
      timestamp: new Date(record.timestamp),
      temperature: record.temperature,
      humidity: record.humidity,
      isValid: record.is_valid,
      validationErrors: record.validation_errors
    }));
  }

  /**
   * Получение метаданных устройства
   */
  async getDeviceMetadata(fileId: string): Promise<DeviceMetadata | null> {
    const { data, error } = await supabase
      .from('device_metadata')
      .select('*')
      .eq('file_id', fileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Запись не найдена
      throw new Error(`Ошибка получения метаданных устройства: ${error.message}`);
    }

    return {
      deviceType: data.device_type,
      deviceModel: data.device_model,
      serialNumber: data.serial_number,
      firmwareVersion: data.firmware_version,
      calibrationDate: data.calibration_date ? new Date(data.calibration_date) : undefined
    };
  }

  /**
   * Удаление файла и всех связанных данных
   */
  async deleteFile(fileId: string): Promise<void> {
    const { error } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId);

    if (error) throw new Error(`Ошибка удаления файла: ${error.message}`);
  }

  /**
   * Обновление порядка файлов
   */
  async updateFileOrder(fileId: string, newOrder: number): Promise<void> {
    const { error } = await supabase
      .from('uploaded_files')
      .update({ 
        file_order: newOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) throw new Error(`Ошибка обновления порядка файла: ${error.message}`);
  }

  /**
   * Обновление полей файла
   */
  async updateFileFields(fileId: string, fields: { zoneNumber?: number; measurementLevel?: string }): Promise<void> {
    const { error } = await supabase
      .from('uploaded_files')
      .update({
        zone_number: fields.zoneNumber,
        measurement_level: fields.measurementLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (error) throw new Error(`Ошибка обновления полей файла: ${error.message}`);
  }

  /**
   * Сохранение сессии анализа
   */
  async saveAnalysisSession(session: {
    name: string;
    description?: string;
    fileIds: string[];
    dataType: 'temperature' | 'humidity';
    contractFields: Record<string, any>;
    conclusions?: string;
  }): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: user.id,
        name: session.name,
        description: session.description,
        file_ids: session.fileIds,
        data_type: session.dataType,
        contract_fields: session.contractFields,
        conclusions: session.conclusions
      })
      .select()
      .single();

    if (error) throw new Error(`Ошибка сохранения сессии анализа: ${error.message}`);
    return data.id;
  }

  /**
   * Обновление сессии анализа
   */
  async updateAnalysisSession(sessionId: string, updates: {
    name?: string;
    description?: string;
    contractFields?: Record<string, any>;
    conclusions?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('analysis_sessions')
      .update({
        ...updates,
        contract_fields: updates.contractFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw new Error(`Ошибка обновления сессии анализа: ${error.message}`);
  }

  /**
   * Сохранение настроек графика
   */
  async saveChartSettings(sessionId: string, dataType: 'temperature' | 'humidity', limits: ChartLimits, zoomState?: ZoomState): Promise<void> {
    const { error } = await supabase
      .from('chart_settings')
      .upsert({
        session_id: sessionId,
        data_type: dataType,
        limits: limits,
        zoom_state: zoomState,
        updated_at: new Date().toISOString()
      });

    if (error) throw new Error(`Ошибка сохранения настроек графика: ${error.message}`);
  }

  /**
   * Сохранение вертикальных маркеров
   */
  async saveVerticalMarkers(sessionId: string, markers: VerticalMarker[]): Promise<void> {
    // Сначала удаляем существующие маркеры для этой сессии
    await supabase
      .from('vertical_markers')
      .delete()
      .eq('session_id', sessionId);

    if (markers.length === 0) return;

    // Сохраняем новые маркеры
    const markerRecords = markers.map(marker => ({
      session_id: sessionId,
      timestamp: new Date(marker.timestamp).toISOString(),
      label: marker.label,
      color: marker.color,
      marker_type: marker.type
    }));

    const { error } = await supabase
      .from('vertical_markers')
      .insert(markerRecords);

    if (error) throw new Error(`Ошибка сохранения маркеров: ${error.message}`);
  }

  /**
   * Получение сессий анализа пользователя
   */
  async getUserAnalysisSessions(): Promise<DatabaseAnalysisSession[]> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');

    const { data, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Ошибка получения сессий анализа: ${error.message}`);
    return data;
  }

  /**
   * Получение настроек графика
   */
  async getChartSettings(sessionId: string, dataType: 'temperature' | 'humidity'): Promise<{ limits: ChartLimits; zoomState?: ZoomState } | null> {
    const { data, error } = await supabase
      .from('chart_settings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('data_type', dataType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Запись не найдена
      throw new Error(`Ошибка получения настроек графика: ${error.message}`);
    }

    return {
      limits: data.limits,
      zoomState: data.zoom_state
    };
  }

  /**
   * Получение вертикальных маркеров
   */
  async getVerticalMarkers(sessionId: string): Promise<VerticalMarker[]> {
    const { data, error } = await supabase
      .from('vertical_markers')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`Ошибка получения маркеров: ${error.message}`);

    return data.map(marker => ({
      id: marker.id,
      timestamp: new Date(marker.timestamp).getTime(),
      label: marker.label,
      color: marker.color,
      type: marker.marker_type
    }));
  }

  /**
   * Преобразование данных из базы в формат UploadedFile
   */
  private mapDatabaseFileToUploadedFile(dbFile: any): UploadedFile {
    const deviceMetadata = dbFile.device_metadata?.[0];
    
    return {
      id: dbFile.id,
      name: dbFile.name,
      uploadDate: new Date(dbFile.upload_date).toLocaleString('ru-RU'),
      parsingStatus: dbFile.parsing_status,
      errorMessage: dbFile.error_message,
      recordCount: dbFile.record_count,
      period: dbFile.period_start && dbFile.period_end 
        ? `${new Date(dbFile.period_start).toLocaleDateString('ru-RU')} - ${new Date(dbFile.period_end).toLocaleDateString('ru-RU')}`
        : undefined,
      zoneNumber: dbFile.zone_number,
      measurementLevel: dbFile.measurement_level,
      order: dbFile.file_order,
      parsedData: deviceMetadata ? {
        fileName: dbFile.name,
        deviceMetadata: {
          deviceType: deviceMetadata.device_type,
          deviceModel: deviceMetadata.device_model,
          serialNumber: deviceMetadata.serial_number,
          firmwareVersion: deviceMetadata.firmware_version,
          calibrationDate: deviceMetadata.calibration_date ? new Date(deviceMetadata.calibration_date) : undefined
        },
        measurements: [], // Измерения загружаются отдельно при необходимости
        startDate: new Date(dbFile.period_start),
        endDate: new Date(dbFile.period_end),
        recordCount: dbFile.record_count,
        parsingStatus: 'completed'
      } : undefined
    };
  }
}

export const supabaseDatabaseService = SupabaseDatabaseService.getInstance();