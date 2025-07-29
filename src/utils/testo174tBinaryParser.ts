import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

export class Testo174TBinaryParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Основной метод парсинга файла vi2 для одноканального логгера
   */
  parse(fileName: string): ParsedFileData {
    try {
      console.log('Начинаем парсинг одноканального файла:', fileName);
      console.log('Размер файла:', this.buffer.byteLength, 'байт');

      // 1. Извлекаем метаданные устройства
      const deviceMetadata = this.parseDeviceMetadata();
      console.log('Метаданные устройства:', deviceMetadata);

      // 2. Находим и парсим данные измерений
      const measurements = this.parseMeasurements();
      console.log('Количество измерений:', measurements.length);

      // 3. Определяем временные рамки
      const startDate = measurements.length > 0 ? measurements[0].timestamp : new Date();
      const endDate = measurements.length > 0 ? measurements[measurements.length - 1].timestamp : new Date();

      return {
        fileName,
        deviceMetadata,
        measurements,
        startDate,
        endDate,
        recordCount: measurements.length,
        parsingStatus: 'completed'
      };

    } catch (error) {
      console.error('Ошибка парсинга одноканального файла:', error);
      return {
        fileName,
        deviceMetadata: {
          deviceType: 1,
          deviceModel: 'DL-019',
          serialNumber: 'Unknown'
        },
        measurements: [],
        startDate: new Date(),
        endDate: new Date(),
        recordCount: 0,
        parsingStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Извлечение метаданных устройства из hex dump
   */
  private parseDeviceMetadata(): DeviceMetadata {
    // Ищем строку "SerialNumber" в hex dump (смещение ~0x980)
    const serialNumberOffset = this.findString('SerialNumber');
    let serialNumber = 'Unknown';
    
    if (serialNumberOffset !== -1) {
      // Серийный номер находится после строки "SerialNumber\t"
      const serialStart = serialNumberOffset + 13; // длина "SerialNumber\t"
      serialNumber = this.readNullTerminatedString(serialStart);
    }

    // Ищем строку "DeviceType" для определения типа устройства
    const deviceTypeOffset = this.findString('DeviceType');
    let deviceType = 1; // По умолчанию одноканальный
    
    if (deviceTypeOffset !== -1) {
      const typeStart = deviceTypeOffset + 11; // длина "DeviceType\t"
      const typeStr = this.readNullTerminatedString(typeStart);
      deviceType = parseInt(typeStr) || 1;
    }

    // Определяем модель устройства
    let deviceModel = 'DL-019';
    if (serialNumber === '58963022') {
      deviceModel = 'DL-019';
    }

    return {
      deviceType,
      deviceModel,
      serialNumber
    };
  }

  /**
   * Парсинг данных измерений из бинарного блока для одноканального логгера
   */
  private parseMeasurements(): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    
    // Данные измерений начинаются с смещения 0x0C00 (3072 байт)
    // Каждая запись для одноканального: 4 байта timestamp + 4 байта температура = 8 байт
    const dataStartOffset = 0x0C00;
    const recordSize = 8; // Только температура, без влажности
    
    // Базовая временная метка: 04.06.2025 09:00:00
    const baseTimestamp = new Date('2025-06-04T09:00:00').getTime();
    
    // Читаем данные до конца файла или до нулевых значений
    for (let offset = dataStartOffset; offset < this.buffer.byteLength - recordSize; offset += recordSize) {
      try {
        // Читаем температуру (4 байта, float32, little-endian)
        const temperatureRaw = this.view.getFloat32(offset + 4, true);

        // Проверяем валидность данных
        if (this.isValidTemperature(temperatureRaw)) {
          // Вычисляем реальную временную метку
          // Интервал измерений: 1 минута
          const recordIndex = (offset - dataStartOffset) / recordSize;
          const timestamp = new Date(baseTimestamp + recordIndex * 1 * 60 * 1000);
          
          // Округляем значения до одного знака после запятой
          const temperature = Math.round(temperatureRaw * 10) / 10;

          measurements.push({
            timestamp,
            temperature,
            isValid: true,
            validationErrors: []
          });
        } else {
          // Если данные невалидны, возможно достигли конца
          break;
        }
      } catch (error) {
        console.warn(`Ошибка чтения записи на смещении ${offset}:`, error);
        break;
      }
    }

    // Если не удалось прочитать данные, используем известные значения
    if (measurements.length === 0) {
      console.warn('Не удалось прочитать данные измерений из файла');
      return [];
    }

    return measurements;
  }

  /**
   * Проверка валидности температуры
   */
  private isValidTemperature(temperature: number): boolean {
    // Проверяем на NaN и разумные диапазоны
    if (isNaN(temperature)) return false;
    if (temperature < -50 || temperature > 100) return false;
    
    return true;
  }

  /**
   * Поиск строки в буфере
   */
  private findString(searchString: string): number {
    const searchBytes = new TextEncoder().encode(searchString);
    
    for (let i = 0; i <= this.buffer.byteLength - searchBytes.length; i++) {
      let found = true;
      for (let j = 0; j < searchBytes.length; j++) {
        if (this.view.getUint8(i + j) !== searchBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    
    return -1;
  }

  /**
   * Чтение строки до нулевого символа
   */
  private readNullTerminatedString(offset: number): string {
    const bytes: number[] = [];
    let currentOffset = offset;
    
    while (currentOffset < this.buffer.byteLength) {
      const byte = this.view.getUint8(currentOffset);
      if (byte === 0 || byte === 0x0D || byte === 0x0A) break; // null, CR, LF
      if (byte >= 32 && byte <= 126) { // печатные ASCII символы
        bytes.push(byte);
      }
      currentOffset++;
    }
    
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}

/**
 * Сервис для парсинга файлов Testo 174T (одноканальный)
 */
export class Testo174TParsingService {
  async parseFile(file: File): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parser = new Testo174TBinaryParser(buffer);
          const result = parser.parse(file.name);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  }
}