// Парсер для файлов формата vi2 от логгеров Testo 174T и 174H
import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

// Константы для валидации
const TEMPERATURE_MIN = -40;
const TEMPERATURE_MAX = 85;
const HUMIDITY_MIN = 0;
const HUMIDITY_MAX = 100;

// Структура заголовка файла vi2
interface Vi2Header {
  deviceName: string;
  startDate: Date;
  endDate: Date;
  channelCount: number;
  recordCount: number;
  temperatureMin: number;
  temperatureMax: number;
  temperatureAvg: number;
  humidityMin?: number;
  humidityMax?: number;
  humidityAvg?: number;
  recordSize: number;
  dataOffset: number;
}

// Структура одной записи измерения
interface Vi2Record {
  id: number;
  timestamp: Date;
  temperature: number;
  humidity?: number;
}

export class Vi2Parser {
  private buffer: ArrayBuffer;
  private view: DataView;
  private fileName: string;

  constructor(buffer: ArrayBuffer, fileName: string) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.fileName = fileName;
  }

  // Основной метод парсинга файла
  async parse(): Promise<ParsedFileData> {
    try {
      // 1. Парсим заголовок
      const header = this.parseHeader();
      
      // 2. Извлекаем метаданные устройства
      const deviceMetadata = this.extractDeviceMetadata(header);
      
      // 3. Парсим записи измерений
      const measurements = this.parseRecords(header);
      
      // 4. Валидируем данные
      const validatedMeasurements = this.validateMeasurements(measurements);

      return {
        fileName: this.fileName,
        deviceMetadata,
        measurements: validatedMeasurements,
        startDate: header.startDate,
        endDate: header.endDate,
        recordCount: header.recordCount,
        parsingStatus: 'completed'
      };
    } catch (error) {
      return {
        fileName: this.fileName,
        deviceMetadata: this.getDefaultDeviceMetadata(),
        measurements: [],
        startDate: new Date(),
        endDate: new Date(),
        recordCount: 0,
        parsingStatus: 'error',
        errorMessage: `Ошибка парсинга: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }

  // Парсинг заголовочной части файла
  private parseHeader(): Vi2Header {
    let offset = 0;

    // Читаем название устройства (предполагаем строку длиной 32 байта)
    const deviceNameBytes = new Uint8Array(this.buffer, offset, 32);
    const deviceName = this.bytesToString(deviceNameBytes).trim();
    offset += 32;

    // Читаем дату начала записи (6 байт: год, месяц, день, час, минута, секунда)
    const startYear = 2000 + this.view.getUint8(offset++);
    const startMonth = this.view.getUint8(offset++) - 1; // JavaScript месяцы 0-11
    const startDay = this.view.getUint8(offset++);
    const startHour = this.view.getUint8(offset++);
    const startMinute = this.view.getUint8(offset++);
    const startSecond = this.view.getUint8(offset++);
    const startDate = new Date(startYear, startMonth, startDay, startHour, startMinute, startSecond);

    // Читаем дату окончания записи (6 байт)
    const endYear = 2000 + this.view.getUint8(offset++);
    const endMonth = this.view.getUint8(offset++) - 1;
    const endDay = this.view.getUint8(offset++);
    const endHour = this.view.getUint8(offset++);
    const endMinute = this.view.getUint8(offset++);
    const endSecond = this.view.getUint8(offset++);
    const endDate = new Date(endYear, endMonth, endDay, endHour, endMinute, endSecond);

    // Читаем количество каналов (1 байт)
    const channelCount = this.view.getUint8(offset++);

    // Читаем общее количество записей (4 байта)
    const recordCount = this.view.getUint32(offset, true); // little-endian
    offset += 4;

    // Читаем статистику по температуре (по 4 байта на значение, float32)
    const temperatureMin = this.view.getFloat32(offset, true);
    offset += 4;
    const temperatureMax = this.view.getFloat32(offset, true);
    offset += 4;
    const temperatureAvg = this.view.getFloat32(offset, true);
    offset += 4;

    // Читаем статистику по влажности (если есть второй канал)
    let humidityMin, humidityMax, humidityAvg;
    if (channelCount > 1) {
      humidityMin = this.view.getFloat32(offset, true);
      offset += 4;
      humidityMax = this.view.getFloat32(offset, true);
      offset += 4;
      humidityAvg = this.view.getFloat32(offset, true);
      offset += 4;
    }

    // Вычисляем размер одной записи и смещение до данных
    const recordSize = channelCount === 1 ? 12 : 16; // ID(4) + время(6) + температура(2) + влажность(2 если есть)
    const dataOffset = offset;

    return {
      deviceName,
      startDate,
      endDate,
      channelCount,
      recordCount,
      temperatureMin,
      temperatureMax,
      temperatureAvg,
      humidityMin,
      humidityMax,
      humidityAvg,
      recordSize,
      dataOffset
    };
  }

  // Извлечение метаданных устройства
  private extractDeviceMetadata(header: Vi2Header): DeviceMetadata {
    // Извлекаем информацию из имени файла
    const fileNameMatch = this.fileName.match(/DL-(\d+)_(\d+)_/);
    const deviceModel = fileNameMatch ? `DL-${fileNameMatch[1]}` : header.deviceName;
    const serialNumber = fileNameMatch ? fileNameMatch[2] : 'Unknown';

    return {
      deviceType: header.channelCount,
      deviceModel,
      serialNumber,
      firmwareVersion: 'Unknown'
    };
  }

  // Парсинг записей измерений
  private parseRecords(header: Vi2Header): Vi2Record[] {
    const records: Vi2Record[] = [];
    let offset = header.dataOffset;

    for (let i = 0; i < header.recordCount; i++) {
      try {
        // Читаем ID записи (4 байта)
        const id = this.view.getUint32(offset, true);
        offset += 4;

        // Читаем временную метку (6 байт)
        const year = 2000 + this.view.getUint8(offset++);
        const month = this.view.getUint8(offset++) - 1;
        const day = this.view.getUint8(offset++);
        const hour = this.view.getUint8(offset++);
        const minute = this.view.getUint8(offset++);
        const second = this.view.getUint8(offset++);
        const timestamp = new Date(year, month, day, hour, minute, second);

        // Читаем температуру (2 байта, значение * 10)
        const temperatureRaw = this.view.getInt16(offset, true);
        const temperature = temperatureRaw / 10.0;
        offset += 2;

        // Читаем влажность (если есть второй канал)
        let humidity: number | undefined;
        if (header.channelCount > 1) {
          const humidityRaw = this.view.getInt16(offset, true);
          humidity = humidityRaw / 10.0;
          offset += 2;
        }

        records.push({
          id,
          timestamp,
          temperature,
          humidity
        });
      } catch (error) {
        console.warn(`Ошибка чтения записи ${i}:`, error);
        break;
      }
    }

    return records;
  }

  // Валидация измерений
  private validateMeasurements(records: Vi2Record[]): MeasurementRecord[] {
    return records.map(record => {
      const errors: string[] = [];

      // Валидация температуры
      if (record.temperature < TEMPERATURE_MIN || record.temperature > TEMPERATURE_MAX) {
        errors.push(`Температура ${record.temperature}°C вне допустимого диапазона`);
      }

      // Валидация влажности
      if (record.humidity !== undefined) {
        if (record.humidity < HUMIDITY_MIN || record.humidity > HUMIDITY_MAX) {
          errors.push(`Влажность ${record.humidity}% вне допустимого диапазона`);
        }
      }

      return {
        timestamp: record.timestamp,
        temperature: record.temperature,
        humidity: record.humidity,
        isValid: errors.length === 0,
        validationErrors: errors
      };
    });
  }

  // Вспомогательные методы
  private bytesToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder('utf-8');
    // Находим первый нулевой байт (конец строки)
    const nullIndex = bytes.indexOf(0);
    const validBytes = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes;
    return decoder.decode(validBytes);
  }

  private getDefaultDeviceMetadata(): DeviceMetadata {
    const fileNameMatch = this.fileName.match(/DL-(\d+)_(\d+)_/);
    return {
      deviceType: 1,
      deviceModel: fileNameMatch ? `DL-${fileNameMatch[1]}` : 'Unknown',
      serialNumber: fileNameMatch ? fileNameMatch[2] : 'Unknown'
    };
  }
}

// Основная функция для парсинга файла vi2
export async function parseVi2File(buffer: ArrayBuffer, fileName: string): Promise<ParsedFileData> {
  const parser = new Vi2Parser(buffer, fileName);
  return await parser.parse();
}

// Сервис для многопоточного парсинга файлов
export class Vi2ParsingService {
  async parseFile(file: File): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsedData = await parseVi2File(buffer, file.name);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  }

  async parseMultipleFiles(files: File[]): Promise<ParsedFileData[]> {
    const results: ParsedFileData[] = [];
    const maxConcurrent = navigator.hardwareConcurrency || 4;
    
    // Обработка файлов пакетами
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(file => 
        this.parseFile(file).catch(error => {
          console.error(`Ошибка парсинга файла ${file.name}:`, error);
          return {
            fileName: file.name,
            deviceMetadata: {
              deviceType: 1,
              deviceModel: 'Unknown',
              serialNumber: 'Unknown'
            },
            measurements: [],
            startDate: new Date(),
            endDate: new Date(),
            recordCount: 0,
            parsingStatus: 'error' as const,
            errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
          };
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}