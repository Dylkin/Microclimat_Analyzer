import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

export class Testo174HBinaryParser {
  private buffer: ArrayBuffer;
  private view: DataView;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Основной метод парсинга файла vi2
   */
  parse(fileName: string): ParsedFileData {
    try {
      console.log('Начинаем парсинг файла:', fileName);
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
      console.error('Ошибка парсинга:', error);
      return {
        fileName,
        deviceMetadata: {
          deviceType: 2,
          deviceModel: 'Unknown',
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
    // Ищем реальную дату начала измерений
    const startDate = this.findActualStartDate();
    
    // Ищем строку "SerialNumber" в hex dump (смещение 0x980)
    const serialNumberOffset = this.findString('SerialNumber');
    let serialNumber = 'Unknown';
    
    if (serialNumberOffset !== -1) {
      // Серийный номер находится после строки "SerialNumber\t"
      const serialStart = serialNumberOffset + 13; // длина "SerialNumber\t"
      serialNumber = this.readNullTerminatedString(serialStart);
    }

    // Ищем строку "DeviceType" для определения типа устройства
    const deviceTypeOffset = this.findString('DeviceType');
    let deviceType = 2; // По умолчанию двухканальный
    
    if (deviceTypeOffset !== -1) {
      const typeStart = deviceTypeOffset + 11; // длина "DeviceType\t"
      const typeStr = this.readNullTerminatedString(typeStart);
      deviceType = parseInt(typeStr) || 2;
    }

    return {
      deviceType,
      deviceModel: 'Unknown',
      serialNumber,
      calibrationDate: startDate
    };
  }

  /**
   * Поиск реальной даты начала измерений в метаданных файла
   */
  private findActualStartDate(): Date {
    try {
      // Ищем строку "StartTime" или "DateTime" в hex dump
      let startTimeOffset = this.findString('StartTime');
      if (startTimeOffset === -1) {
        startTimeOffset = this.findString('DateTime');
      }
      
      if (startTimeOffset !== -1) {
        // Читаем дату после найденной строки
        const dateStr = this.readNullTerminatedString(startTimeOffset + 10);
        const parsedDate = this.parseTimestampString(dateStr);
        if (parsedDate) {
          console.log('Найдена реальная дата начала измерений:', parsedDate);
          return parsedDate;
        }
      }
      
      // Ищем временную метку в бинарном формате в заголовке файла
      const binaryTimestamp = this.findBinaryTimestamp();
      if (binaryTimestamp) {
        console.log('Найдена бинарная временная метка:', binaryTimestamp);
        return binaryTimestamp;
      }
      
      console.warn('Не удалось найти реальную дату начала, используем текущую дату');
      return new Date();
      
    } catch (error) {
      console.error('Ошибка поиска даты начала измерений:', error);
      return new Date();
    }
  }

  /**
   * Поиск бинарной временной метки в заголовке файла
   */
  private findBinaryTimestamp(): Date | null {
    try {
      // Проверяем несколько возможных смещений для временной метки
      const possibleOffsets = [0x20, 0x40, 0x60, 0x80, 0x100, 0x200, 0x400];
      
      for (const offset of possibleOffsets) {
        if (offset + 8 > this.buffer.byteLength) continue;
        
        // Читаем как Unix timestamp (32-bit)
        const timestamp32 = this.view.getUint32(offset, true);
        if (this.isValidUnixTimestamp(timestamp32)) {
          return new Date(timestamp32 * 1000);
        }
        
        // Читаем как Unix timestamp (64-bit)
        const timestamp64 = this.view.getBigUint64(offset, true);
        const timestamp64Number = Number(timestamp64);
        if (this.isValidUnixTimestamp(timestamp64Number / 1000)) {
          return new Date(timestamp64Number);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка поиска бинарной временной метки:', error);
      return null;
    }
  }

  /**
   * Проверка валидности Unix timestamp
   */
  private isValidUnixTimestamp(timestamp: number): boolean {
    // Проверяем, что timestamp находится в разумных пределах
    // От 2020 года до 2030 года
    const min2020 = new Date('2020-01-01').getTime() / 1000;
    const max2030 = new Date('2030-12-31').getTime() / 1000;
    
    return timestamp >= min2020 && timestamp <= max2030;
  }

  /**
   * Парсинг строки с временной меткой
   */
  private parseTimestampString(dateStr: string): Date | null {
    try {
      // Пробуем различные форматы даты
      const formats = [
        // ISO формат
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
        // Европейский формат
        /(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/,
        // Американский формат
        /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const dateString = match[1];
          
          // Преобразуем в стандартный формат
          let standardDate: string;
          if (dateString.includes('.')) {
            // Европейский формат: DD.MM.YYYY HH:MM:SS
            const parts = dateString.split(' ');
            const datePart = parts[0].split('.');
            standardDate = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${parts[1]}`;
          } else if (dateString.includes('/')) {
            // Американский формат: MM/DD/YYYY HH:MM:SS
            const parts = dateString.split(' ');
            const datePart = parts[0].split('/');
            standardDate = `${datePart[2]}-${datePart[0]}-${datePart[1]}T${parts[1]}`;
          } else {
            // ISO формат
            standardDate = dateString;
          }
          
          const parsedDate = new Date(standardDate);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка парсинга строки даты:', error);
      return null;
    }
  }

  /**
   * Определение интервала измерений из метаданных
   */
  private findMeasurementInterval(): number {
    try {
      // Ищем строку "Interval" или "SampleRate"
      let intervalOffset = this.findString('Interval');
      if (intervalOffset === -1) {
        intervalOffset = this.findString('SampleRate');
      }
      
      if (intervalOffset !== -1) {
        const intervalStr = this.readNullTerminatedString(intervalOffset + 9);
        const interval = parseInt(intervalStr);
        
        if (interval > 0 && interval <= 3600) { // От 1 секунды до 1 часа
          console.log('Найден интервал измерений:', interval, 'секунд');
          return interval;
        }
      }
      
      // Пытаемся определить интервал по первым записям данных
      return this.detectIntervalFromData();
      
    } catch (error) {
      console.error('Ошибка определения интервала:', error);
      return 900; // По умолчанию 15 минут
    }
  }

  /**
   * Определение интервала по данным измерений
   */
  private detectIntervalFromData(): number {
    try {
      const dataStartOffset = 0x0C00;
      const recordSize = 12;
      
      // Читаем первые несколько записей для определения интервала
      const timestamps: number[] = [];
      
      for (let i = 0; i < 5 && (dataStartOffset + i * recordSize + 4) < this.buffer.byteLength; i++) {
        const offset = dataStartOffset + i * recordSize;
        const timeValue = this.view.getUint32(offset, true);
        
        if (timeValue > 0) {
          timestamps.push(timeValue);
        }
      }
      
      if (timestamps.length >= 2) {
        // Вычисляем разность между первыми записями
        const diff = timestamps[1] - timestamps[0];
        
        // Проверяем, является ли разность разумным интервалом
        if (diff >= 60 && diff <= 3600) { // От 1 минуты до 1 часа
          console.log('Определен интервал по данным:', diff, 'секунд');
          return diff;
        }
      }
      
      console.log('Не удалось определить интервал по данным, используем 15 минут');
      return 900; // 15 минут по умолчанию
      
    } catch (error) {
      console.error('Ошибка определения интервала по данным:', error);
      return 900;
    }
  }
  /**
   * Парсинг данных измерений из бинарного блока
   */
  private parseMeasurements(): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    
    const dataStartOffset = 0x0C00;
    const recordSize = 12;
    
    // Получаем реальную дату начала измерений
    const startDate = this.findActualStartDate();
    const measurementInterval = this.findMeasurementInterval();
    
    console.log('Начальная дата измерений:', startDate);
    console.log('Интервал измерений:', measurementInterval, 'секунд');
    
    for (let offset = dataStartOffset; offset < this.buffer.byteLength - recordSize; offset += recordSize) {
      try {
        // Читаем временное смещение (первые 4 байта)
        const timeOffset = this.view.getUint32(offset, true);
        
        // Читаем температуру (следующие 4 байта)
        const temperatureRaw = this.view.getFloat32(offset + 4, true);
        
        // Читаем влажность (последние 4 байта)
        const humidityRaw = this.view.getFloat32(offset + 8, true);

        // Проверяем валидность данных и временного смещения
        if (this.isValidMeasurement(temperatureRaw, humidityRaw)) {
          // Вычисляем реальную временную метку на основе смещения
          let timestamp: Date;
          
          if (timeOffset > 0 && timeOffset < 2147483647) { // Проверяем разумность значения
            // Используем временное смещение из файла
            timestamp = new Date(startDate.getTime() + timeOffset * 1000);
          } else {
            // Fallback: используем порядковый номер записи и интервал
            const recordIndex = (offset - dataStartOffset) / recordSize;
            timestamp = new Date(startDate.getTime() + recordIndex * measurementInterval * 1000);
          }
          
          // Округляем значения до одного знака после запятой
          const temperature = Math.round(temperatureRaw * 10) / 10;
          const humidity = Math.round(humidityRaw * 10) / 10;

          measurements.push({
            timestamp,
            temperature,
            humidity,
            isValid: true,
            validationErrors: []
          });
        } else {
          // Если данные невалидны, пропускаем запись но продолжаем чтение
          // (могут быть пропуски в данных)
          continue;
        }
      } catch (error) {
        console.warn(`Ошибка чтения записи на смещении ${offset}:`, error);
        continue; // Продолжаем чтение следующих записей
      }
    }

    if (measurements.length === 0) {
      console.warn('Не удалось прочитать данные измерений из файла, пробуем альтернативный метод');
      return this.parseMeasurementsAlternative();
    }

    // Сортируем измерения по времени на случай, если они были записаны не по порядку
    measurements.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    console.log('Успешно прочитано измерений:', measurements.length);
    console.log('Период измерений:', 
      measurements[0]?.timestamp.toLocaleString('ru-RU'), 
      'до', 
      measurements[measurements.length - 1]?.timestamp.toLocaleString('ru-RU')
    );

    return measurements;
  }

  /**
   * Альтернативный метод парсинга измерений
   * Используется если основной метод не дал результатов
   */
  private parseMeasurementsAlternative(): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    
    try {
      // Пробуем другие возможные смещения для данных
      const alternativeOffsets = [0x0800, 0x1000, 0x1400, 0x1800];
      
      for (const startOffset of alternativeOffsets) {
        if (startOffset >= this.buffer.byteLength) continue;
        
        console.log('Пробуем альтернативное смещение:', startOffset.toString(16));
        
        const tempMeasurements = this.tryParseFromOffset(startOffset);
        if (tempMeasurements.length > measurements.length) {
          measurements.splice(0, measurements.length, ...tempMeasurements);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Ошибка альтернативного парсинга:', error);
      return [];
    }
  }

  /**
   * Попытка парсинга данных с указанного смещения
   */
  private tryParseFromOffset(startOffset: number): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    const recordSize = 12;
    const maxRecords = 1000; // Ограничиваем количество для тестирования
    
    const startDate = this.findActualStartDate();
    const measurementInterval = this.findMeasurementInterval();
    
    for (let i = 0; i < maxRecords && (startOffset + i * recordSize + recordSize) <= this.buffer.byteLength; i++) {
      const offset = startOffset + i * recordSize;
      
      try {
        const timeOffset = this.view.getUint32(offset, true);
        const temperatureRaw = this.view.getFloat32(offset + 4, true);
        const humidityRaw = this.view.getFloat32(offset + 8, true);
        
        if (this.isValidMeasurement(temperatureRaw, humidityRaw)) {
          const timestamp = new Date(startDate.getTime() + i * measurementInterval * 1000);
          
          measurements.push({
            timestamp,
            temperature: Math.round(temperatureRaw * 10) / 10,
            humidity: Math.round(humidityRaw * 10) / 10,
            isValid: true,
            validationErrors: []
          });
        } else {
          // Если встретили невалидные данные, прекращаем чтение с этого смещения
          break;
        }
      } catch (error) {
        break;
      }
    }

    return measurements;
  }

  /**
   * Проверка валидности измерения
   */
  private isValidMeasurement(temperature: number, humidity: number): boolean {
    // Проверяем на NaN и разумные диапазоны
    if (isNaN(temperature) || isNaN(humidity)) return false;
    if (temperature < -50 || temperature > 100) return false;
    if (humidity < 0 || humidity > 100) return false;
    
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
 * Сервис для парсинга файлов Testo 174H
 */
export class Testo174HParsingService {
  async parseFile(file: File): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parser = new Testo174HBinaryParser(buffer);
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