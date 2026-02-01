// Заглушка сервиса парсинга файлов .vi2.
// Основной источник данных сейчас — таблицы logger_data в БД,
// поэтому здесь возвращаем минимальную структуру ParsedFileData,
// чтобы типы в компонентах оставались корректными.

import { ParsedFileData } from '../types/FileData';

export class VI2ParsingService {
  async parseFile(file: File): Promise<ParsedFileData> {
    console.warn('VI2ParsingService.parseFile (stub) called for file:', file.name);

    const now = new Date();

    return {
      fileName: file.name,
      deviceMetadata: {
        deviceType: 0,
        serialNumber: 'UNKNOWN',
        deviceModel: 'UNKNOWN',
      },
      measurements: [],
      startDate: now,
      endDate: now,
      recordCount: 0,
      parsingStatus: 'completed',
      errorMessage: undefined,
    };
  }
}



