import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

/**
 * Парсер для одноканальных логгеров Testo 174T (только температура)
 */
export class Testo174TBinaryParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Основной метод парсинга файла
   */
  async parse(fileName: string): Promise<ParsedFileData> {
    try {
      console.log('Парсинг одноканального файла Testo 174T:', fileName);
      
      // Извлекаем метаданные устройства
      const deviceMetadata = this.parseDeviceMetadata();
      console.log('Метаданные устройства:', deviceMetadata);
      
      // Извлекаем данные измерений
      const measurements = this.parseMeasurements();
      console.log('Количество измерений:', measurements.length);
      
      if (measurements.length === 0) {
        throw new Error('Файл не содержит данных измерений');
      }

      // Определяем временные границы
      const timestamps = measurements.map(m => m.timestamp);
      const startDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
      const endDate = new Date(Math.max(...timestamps.map(t => t.getTime())));

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
      console.error('Ошибка парсинга файла Testo 174T:', error);
      return {
        fileName,
        deviceMetadata: {
          deviceType: 1,
          deviceModel: 'Testo 174T',
          serialNumber: 'Unknown'
        },
        measurements: [],
        startDate: new Date(),
        endDate: new Date(),
        recordCount: 0,
        parsingStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка парсинга'
      };
    }
  }

  /**
   * Парсинг метаданных устройства
   */
  private parseDeviceMetadata(): DeviceMetadata {
    try {
      // Ищем серийный номер в заголовке файла
      const serialNumber = this.findSerialNumber() || 'Unknown';
      
      // Ищем модель устройства
      const deviceModel = this.findDeviceModel() || 'Testo 174T';
      
      // Ищем версию прошивки
      const firmwareVersion = this.findFirmwareVersion();
      
      // Ищем дату калибровки
      const calibrationDate = this.findCalibrationDate();

      return {
        deviceType: 1, // Одноканальный
        serialNumber,
        deviceModel,
        firmwareVersion,
        calibrationDate
      };
    } catch (error) {
      console.error('Ошибка парсинга метаданных:', error);
      return {
        deviceType: 1,
        deviceModel: 'Testo 174T',
        serialNumber: 'Unknown'
      };
    }
  }

  /**
   * Парсинг данных измерений
   */
  private parseMeasurements(): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    
    try {
      // Область данных обычно начинается с 0x0C00
      const dataStartOffset = 0x0C00;
      
      if (dataStartOffset >= this.buffer.byteLength) {
        console.warn('Смещение данных выходит за границы файла');
        return measurements;
      }

      // Размер одной записи для одноканального устройства (обычно 8 байт)
      const recordSize = 8;
      const maxRecords = Math.floor((this.buffer.byteLength - dataStartOffset) / recordSize);
      
      console.log('Максимальное количество записей:', maxRecords);

      for (let i = 0; i < maxRecords; i++) {
        const offset = dataStartOffset + i * recordSize;
        
        if (offset + recordSize > this.buffer.byteLength) {
          break;
        }

        try {
          // Читаем timestamp (4 байта, little-endian)
          const timestampRaw = this.view.getUint32(offset, true);
          
          // Читаем температуру (4 байта, float, little-endian)
          const temperature = this.view.getFloat32(offset + 4, true);
          
          // Проверяем валидность данных
          if (timestampRaw === 0 || timestampRaw === 0xFFFFFFFF) {
            continue; // Пропускаем пустые записи
          }
          
          if (isNaN(temperature) || temperature < -50 || temperature > 100) {
            continue; // Пропускаем невалидные температуры
          }

          // Конвертируем timestamp (обычно это Unix timestamp или смещение)
          const timestamp = this.convertTimestamp(timestampRaw);
          
          measurements.push({
            timestamp,
            temperature,
            humidity: undefined, // Одноканальный логгер не измеряет влажность
            isValid: true,
            validationErrors: []
          });

        } catch (recordError) {
          console.warn(`Ошибка чтения записи ${i}:`, recordError);
          continue;
        }
      }

      console.log('Успешно обработано записей:', measurements.length);
      return measurements;

    } catch (error) {
      console.error('Ошибка парсинга измерений:', error);
      return measurements;
    }
  }

  /**
   * Поиск серийного номера в файле
   */
  private findSerialNumber(): string | undefined {
    try {
      // Ищем паттерн "SerialNumber" в hex
      const serialOffset = this.findHexPattern('53 65 72 69 61 6C 4E 75 6D 62 65 72 09');
      
      if (serialOffset !== -1) {
        const valueOffset = serialOffset + 13; // длина "SerialNumber\t"
        return this.readNullTerminatedString(valueOffset);
      }

      return undefined;
    } catch (error) {
      console.error('Ошибка поиска серийного номера:', error);
      return undefined;
    }
  }

  /**
   * Поиск модели устройства в файле
   */
  private findDeviceModel(): string | undefined {
    try {
      // Ищем паттерн "DeviceModel" в hex
      const modelOffset = this.findHexPattern('44 65 76 69 63 65 4D 6F 64 65 6C 09');
      
      if (modelOffset !== -1) {
        const valueOffset = modelOffset + 12; // длина "DeviceModel\t"
        return this.readNullTerminatedString(valueOffset);
      }

      return undefined;
    } catch (error) {
      console.error('Ошибка поиска модели устройства:', error);
      return undefined;
    }
  }

  /**
   * Поиск версии прошивки в файле
   */
  private findFirmwareVersion(): string | undefined {
    try {
      // Ищем паттерн "FirmwareVersion" в hex
      const firmwareOffset = this.findHexPattern('46 69 72 6D 77 61 72 65 56 65 72 73 69 6F 6E 09');
      
      if (firmwareOffset !== -1) {
        const valueOffset = firmwareOffset + 16; // длина "FirmwareVersion\t"
        return this.readNullTerminatedString(valueOffset);
      }

      return undefined;
    } catch (error) {
      console.error('Ошибка поиска версии прошивки:', error);
      return undefined;
    }
  }

  /**
   * Поиск даты калибровки в файле
   */
  private findCalibrationDate(): Date | undefined {
    try {
      // Ищем паттерн "CalibrationDate" в hex
      const calibrationOffset = this.findHexPattern('43 61 6C 69 62 72 61 74 69 6F 6E 44 61 74 65 09');
      
      if (calibrationOffset !== -1) {
        const valueOffset = calibrationOffset + 16; // длина "CalibrationDate\t"
        const dateString = this.readNullTerminatedString(valueOffset);
        
        if (dateString) {
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? undefined : date;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Ошибка поиска даты калибровки:', error);
      return undefined;
    }
  }

  /**
   * Поиск hex паттерна в файле
   */
  private findHexPattern(hexPattern: string): number {
    const patternBytes = hexPattern.split(' ').map(hex => parseInt(hex, 16));
    
    for (let i = 0; i <= this.buffer.byteLength - patternBytes.length; i++) {
      let found = true;
      for (let j = 0; j < patternBytes.length; j++) {
        if (this.view.getUint8(i + j) !== patternBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return i;
      }
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
      if (byte === 0 || byte === 0x0D || byte === 0x0A) break;
      if (byte >= 32 && byte <= 126) {
        bytes.push(byte);
      }
      currentOffset++;
    }
    
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  /**
   * Конвертация timestamp из формата устройства в Date
   */
  private convertTimestamp(rawTimestamp: number): Date {
    try {
      // Для Testo 174T timestamp может быть в разных форматах
      // Пробуем несколько вариантов конвертации
      
      // Вариант 1: Unix timestamp в секундах
      if (rawTimestamp > 1000000000 && rawTimestamp < 2000000000) {
        return new Date(rawTimestamp * 1000);
      }
      
      // Вариант 2: Unix timestamp в миллисекундах
      if (rawTimestamp > 1000000000000) {
        return new Date(rawTimestamp);
      }
      
      // Вариант 3: Смещение от эпохи устройства (1 января 2000)
      const deviceEpoch = new Date('2000-01-01T00:00:00Z').getTime();
      const timestampMs = deviceEpoch + (rawTimestamp * 1000);
      
      const convertedDate = new Date(timestampMs);
      
      // Проверяем разумность даты (между 2000 и 2030 годами)
      if (convertedDate.getFullYear() >= 2000 && convertedDate.getFullYear() <= 2030) {
        return convertedDate;
      }
      
      // Если ничего не подошло, используем текущее время с добавлением смещения
      return new Date(Date.now() + rawTimestamp * 1000);
      
    } catch (error) {
      console.error('Ошибка конвертации timestamp:', error);
      return new Date();
    }
  }
}