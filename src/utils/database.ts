import { ParsedFileData, DeviceMetadata, MeasurementRecord } from '../types/FileData';

// Симуляция базы данных в localStorage
class DatabaseService {
  private readonly METADATA_KEY = 'device_metadata';
  private readonly MEASUREMENTS_KEY = 'measurements';
  
  // Сохранение метаданных устройства
  async saveDeviceMetadata(metadata: DeviceMetadata, fileId: string): Promise<void> {
    try {
      const existingData = this.getStoredData(this.METADATA_KEY);
      existingData[fileId] = {
        ...metadata,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(existingData));
    } catch (error) {
      throw new Error(`Ошибка сохранения метаданных: ${error}`);
    }
  }
  
  // Сохранение измерений
  async saveMeasurements(measurements: MeasurementRecord[], fileId: string): Promise<void> {
    try {
      const existingData = this.getStoredData(this.MEASUREMENTS_KEY);
      existingData[fileId] = {
        measurements: measurements.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        })),
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.MEASUREMENTS_KEY, JSON.stringify(existingData));
    } catch (error) {
      throw new Error(`Ошибка сохранения измерений: ${error}`);
    }
  }
  
  // Сохранение полных данных файла
  async saveParsedFileData(parsedData: ParsedFileData, fileId: string): Promise<void> {
    try {
      await this.saveDeviceMetadata(parsedData.deviceMetadata, fileId);
      await this.saveMeasurements(parsedData.measurements, fileId);
      
      // Сохранение сводной информации
      const summaryKey = 'file_summaries';
      const summaries = this.getStoredData(summaryKey);
      summaries[fileId] = {
        fileName: parsedData.fileName,
        deviceType: parsedData.deviceMetadata.deviceType,
        deviceModel: parsedData.deviceMetadata.deviceModel,
        serialNumber: parsedData.deviceMetadata.serialNumber,
        startDate: parsedData.startDate.toISOString(),
        endDate: parsedData.endDate.toISOString(),
        recordCount: parsedData.recordCount,
        parsingStatus: parsedData.parsingStatus,
        errorMessage: parsedData.errorMessage,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(summaryKey, JSON.stringify(summaries));
    } catch (error) {
      throw new Error(`Ошибка сохранения данных файла: ${error}`);
    }
  }
  
  // Получение метаданных устройства
  async getDeviceMetadata(fileId: string): Promise<DeviceMetadata | null> {
    try {
      const data = this.getStoredData(this.METADATA_KEY);
      return data[fileId] || null;
    } catch (error) {
      console.error('Ошибка получения метаданных:', error);
      return null;
    }
  }
  
  // Получение измерений
  async getMeasurements(fileId: string): Promise<MeasurementRecord[] | null> {
    try {
      const data = this.getStoredData(this.MEASUREMENTS_KEY);
      const fileData = data[fileId];
      
      if (!fileData) return null;
      
      return fileData.measurements.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (error) {
      console.error('Ошибка получения измерений:', error);
      return null;
    }
  }
  
  // Получение сводки по файлу
  async getFileSummary(fileId: string): Promise<any> {
    try {
      const summaries = this.getStoredData('file_summaries');
      return summaries[fileId] || null;
    } catch (error) {
      console.error('Ошибка получения сводки файла:', error);
      return null;
    }
  }
  
  // Получение всех сводок
  async getAllFileSummaries(): Promise<any[]> {
    try {
      const summaries = this.getStoredData('file_summaries');
      return Object.values(summaries);
    } catch (error) {
      console.error('Ошибка получения всех сводок:', error);
      return [];
    }
  }
  
  // Удаление данных файла
  async deleteFileData(fileId: string): Promise<void> {
    try {
      // Удаление метаданных
      const metadata = this.getStoredData(this.METADATA_KEY);
      delete metadata[fileId];
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
      
      // Удаление измерений
      const measurements = this.getStoredData(this.MEASUREMENTS_KEY);
      delete measurements[fileId];
      localStorage.setItem(this.MEASUREMENTS_KEY, JSON.stringify(measurements));
      
      // Удаление сводки
      const summaries = this.getStoredData('file_summaries');
      delete summaries[fileId];
      localStorage.setItem('file_summaries', JSON.stringify(summaries));
    } catch (error) {
      throw new Error(`Ошибка удаления данных файла: ${error}`);
    }
  }
  
  private getStoredData(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error(`Ошибка чтения данных из localStorage (${key}):`, error);
      return {};
    }
  }
}

export const databaseService = new DatabaseService();