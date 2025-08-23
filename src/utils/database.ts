import { ParsedFileData, DeviceMetadata, MeasurementRecord } from '../types/FileData';

// IndexedDB-based database service for handling large measurement datasets
class DatabaseService {
  private readonly DB_NAME = 'MicroclimatDB';
  private readonly DB_VERSION = 1;
  private readonly METADATA_STORE = 'device_metadata';
  private readonly MEASUREMENTS_STORE = 'measurements';
  private readonly SUMMARIES_STORE = 'file_summaries';
  
  private db: IDBDatabase | null = null;
  
  // Initialize IndexedDB
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
          db.createObjectStore(this.METADATA_STORE);
        }
        
        if (!db.objectStoreNames.contains(this.MEASUREMENTS_STORE)) {
          db.createObjectStore(this.MEASUREMENTS_STORE);
        }
        
        if (!db.objectStoreNames.contains(this.SUMMARIES_STORE)) {
          db.createObjectStore(this.SUMMARIES_STORE);
        }
      };
    });
  }
  
  // Helper method for IndexedDB operations
  private async performDBOperation<T>(
    storeName: string,
    operation: (store: IDBObjectStore) => IDBRequest,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<T> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Сохранение метаданных устройства (остается в localStorage для быстрого доступа)
  async saveDeviceMetadata(metadata: DeviceMetadata, fileId: string): Promise<void> {
    try {
      const existingData = this.getStoredData('device_metadata');
      existingData[fileId] = {
        ...metadata,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('device_metadata', JSON.stringify(existingData));
    } catch (error) {
      throw new Error(`Ошибка сохранения метаданных: ${error}`);
    }
  }
  
  // Сохранение измерений в IndexedDB
  async saveMeasurements(measurements: MeasurementRecord[], fileId: string): Promise<void> {
    try {
      const measurementData = {
        measurements: measurements.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        })),
        savedAt: new Date().toISOString()
      };
      
      await this.performDBOperation(
        this.MEASUREMENTS_STORE,
        (store) => store.put(measurementData, fileId),
        'readwrite'
      );
    } catch (error) {
      throw new Error(`Ошибка сохранения измерений: ${error}`);
    }
  }
  
  // Сохранение полных данных файла
  async saveParsedFileData(parsedData: ParsedFileData, fileId: string): Promise<void> {
    try {
      await this.saveDeviceMetadata(parsedData.deviceMetadata, fileId);
      await this.saveMeasurements(parsedData.measurements, fileId);
      
      // Сохранение сводной информации в localStorage
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
      const data = this.getStoredData('device_metadata');
      return data[fileId] || null;
    } catch (error) {
      console.error('Ошибка получения метаданных:', error);
      return null;
    }
  }
  
  // Получение измерений из IndexedDB
  async getMeasurements(fileId: string): Promise<MeasurementRecord[] | null> {
    try {
      console.log(`Запрос измерений для файла: ${fileId}`);
      
      const fileData = await this.performDBOperation<any>(
        this.MEASUREMENTS_STORE,
        (store) => store.get(fileId)
      );
      
      if (!fileData) {
        console.log(`Данные не найдены для файла: ${fileId}`);
        return null;
      }
      
      if (!fileData.measurements || !Array.isArray(fileData.measurements)) {
        console.log(`Некорректная структура данных для файла: ${fileId}`);
        return null;
      }
      
      console.log(`Найдено ${fileData.measurements.length} измерений для файла: ${fileId}`);
      
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
      // Удаление метаданных из localStorage
      const metadata = this.getStoredData('device_metadata');
      delete metadata[fileId];
      localStorage.setItem('device_metadata', JSON.stringify(metadata));
      
      // Удаление измерений из IndexedDB
      await this.performDBOperation(
        this.MEASUREMENTS_STORE,
        (store) => store.delete(fileId),
        'readwrite'
      );
      
      // Удаление сводки из localStorage
      const summaries = this.getStoredData('file_summaries');
      delete summaries[fileId];
      localStorage.setItem('file_summaries', JSON.stringify(summaries));
    } catch (error) {
      throw new Error(`Ошибка удаления данных файла: ${error}`);
    }
  }
  
  // Получение файлов проекта (заглушка для будущей реализации)
  async getProjectFiles(projectId: string): Promise<UploadedFile[] | null> {
    try {
      // TODO: Реализовать загрузку файлов из Supabase по project_id
      // Пока что возвращаем null, так как связь с проектами еще не реализована
      console.log('Запрос файлов для проекта:', projectId);
      return null;
    } catch (error) {
      console.error('Ошибка получения файлов проекта:', error);
      return null;
    }
  }
  
  // Сохранение связи файла с проектом (заглушка для будущей реализации)
  async saveFileProjectAssociation(fileId: string, projectId: string): Promise<void> {
    try {
      // TODO: Реализовать сохранение связи файла с проектом в Supabase
      console.log('Сохранение связи файла с проектом:', { fileId, projectId });
    } catch (error) {
      console.error('Ошибка сохранения связи файла с проектом:', error);
      throw error;
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