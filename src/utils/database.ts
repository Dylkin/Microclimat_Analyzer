// Заглушка сервиса базы данных на фронтенде.
// Исторически тут было локальное хранилище измерений, сейчас все
// сохраняется через backend (loggerDataService). Оставляем минимальные
// методы, чтобы не ломать существующий код.

import { ParsedFileData, MeasurementRecord } from '../types/FileData';

class DatabaseService {
  isAvailable(): boolean {
    return false;
  }

  // Ранее возвращал измерения для файла из локальной БД.
  async getMeasurements(fileId: string): Promise<MeasurementRecord[]> {
    console.warn('databaseService.getMeasurements (stub) called for fileId:', fileId);
    return [];
  }

  // Ранее сохранял распарсенные данные файла в локальную БД.
  async saveParsedFileData(parsedData: ParsedFileData, fileId: string): Promise<void> {
    console.warn('databaseService.saveParsedFileData (stub) called for fileId:', fileId, parsedData);
  }

  // Ранее удалял данные файла из локальной БД.
  async deleteFileData(fileId: string): Promise<void> {
    console.warn('databaseService.deleteFileData (stub) called for fileId:', fileId);
  }
}

export const databaseService = new DatabaseService();



