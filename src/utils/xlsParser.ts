import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';

/**
 * Парсер для файлов XLS/XLSX
 * Обрабатывает файлы Excel с данными температуры и влажности
 * Использует exceljs для .xlsx и xlsx (SheetJS) для старых .xls файлов
 */
export class XLSParser {
  private buffer: ArrayBuffer;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
  }

  /**
   * Определение формата файла (XLS или XLSX)
   */
  private detectFileFormat(): 'xls' | 'xlsx' | 'unknown' {
    // Проверяем сигнатуру файла
    const uint8Array = new Uint8Array(this.buffer.slice(0, 8));
    
    // XLSX - это ZIP архив, начинается с PK (50 4B)
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
      return 'xlsx';
    }
    
    // XLS (BIFF) - начинается с D0 CF 11 E0 A1 B1 1A E1 (OLE2 header)
    if (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF && 
        uint8Array[2] === 0x11 && uint8Array[3] === 0xE0 &&
        uint8Array[4] === 0xA1 && uint8Array[5] === 0xB1 &&
        uint8Array[6] === 0x1A && uint8Array[7] === 0xE1) {
      return 'xls';
    }
    
    return 'unknown';
  }

  /**
   * Основной метод парсинга XLS файла
   */
  async parse(fileName: string): Promise<ParsedFileData> {
    try {
      console.log('XLSParser: Начинаем анализ XLS файла:', fileName);
      console.log('XLSParser: Размер файла:', this.buffer.byteLength, 'байт');

      // Определяем формат файла
      const fileFormat = this.detectFileFormat();
      console.log('XLSParser: Определен формат файла:', fileFormat);

      let jsonData: any[][];

      // Для старых .xls файлов используем xlsx (SheetJS)
      if (fileFormat === 'xls') {
        console.log('XLSParser: Используем xlsx (SheetJS) для чтения старого формата .xls');
        jsonData = await this.parseXLSFile();
      } else {
        // Для .xlsx используем exceljs
        if (fileFormat === 'unknown') {
          console.warn('XLSParser: Не удалось определить формат файла, пробуем загрузить как XLSX...');
        }

        // Читаем Excel файл с помощью exceljs
        const workbook = new ExcelJS.Workbook();
        
        try {
          await workbook.xlsx.load(this.buffer);
          
          console.log('XLSParser: Найдено листов:', workbook.worksheets.length);

          // Ищем лист с данными (обычно первый лист)
          const worksheet = workbook.worksheets[0];
          
          if (!worksheet) {
            throw new Error('Не найден лист с данными в Excel файле');
          }

          // Конвертируем лист в массив массивов (аналог sheet_to_json с header: 1)
          jsonData = this.worksheetToArray(worksheet);
        } catch (xlsxError: any) {
          // Если ошибка связана с форматом файла, пробуем использовать xlsx (SheetJS)
          if (xlsxError.message && (xlsxError.message.includes('zip') || 
              xlsxError.message.includes('central directory'))) {
            console.warn('XLSParser: Не удалось загрузить через exceljs, пробуем через xlsx (SheetJS)...');
            jsonData = await this.parseXLSFile();
          } else {
            throw xlsxError;
          }
        }
      }

      console.log('XLSParser: Загружено строк:', jsonData.length);

      // Парсим данные
      const parsedData = this.parseData(jsonData as any[][], fileName);
      
      console.log('XLSParser: Парсинг завершен:', {
        fileName: parsedData.fileName,
        recordCount: parsedData.recordCount,
        startDate: parsedData.startDate,
        endDate: parsedData.endDate
      });

      return parsedData;

    } catch (error) {
      console.error('Ошибка парсинга XLS файла:', error);
      
      // Определяем тип ошибки и предоставляем понятное сообщение
      let errorMessage = 'Неизвестная ошибка';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Ошибка связанная с форматом файла
        if (errorMsg.includes('zip') || 
            errorMsg.includes('central directory') ||
            errorMsg.includes('biff') ||
            (errorMsg.includes('xls') && errorMsg.includes('not supported'))) {
          errorMessage = 'Не удалось прочитать Excel файл. Убедитесь, что файл не поврежден и имеет корректный формат (.xls или .xlsx).';
        } else if (errorMsg.includes('не найден лист') || errorMsg.includes('worksheet')) {
          errorMessage = 'В Excel файле не найден лист с данными. Убедитесь, что файл содержит хотя бы один лист с данными.';
        } else if (errorMsg.includes('не содержит данных')) {
          errorMessage = 'Файл не содержит данных для обработки. Убедитесь, что в файле есть данные в таблице.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        fileName,
        deviceMetadata: {
          deviceType: 0,
          serialNumber: 'Unknown',
          deviceModel: 'XLS File'
        },
        measurements: [],
        startDate: new Date(),
        endDate: new Date(),
        recordCount: 0,
        parsingStatus: 'error',
        errorMessage: errorMessage
      };
    }
  }

  /**
   * Парсинг старых .xls файлов через xlsx (SheetJS)
   */
  private async parseXLSFile(): Promise<any[][]> {
    try {
      // Конвертируем ArrayBuffer в формат, который понимает xlsx
      const data = new Uint8Array(this.buffer);
      
      // Читаем файл через xlsx (SheetJS)
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Не найден лист с данными в Excel файле');
      }
      
      console.log('XLSParser: Найдено листов через xlsx:', workbook.SheetNames.length);
      
      // Берем первый лист
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('Не найден лист с данными в Excel файле');
      }
      
      // Конвертируем лист в массив массивов (аналог sheet_to_json с header: 1)
      // Используем sheet_to_json с опцией { header: 1 } для получения массива массивов
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null, // Значение по умолчанию для пустых ячеек
        raw: false // Преобразуем даты и числа в строки/числа
      }) as any[][];
      
      // Фильтруем пустые строки
      const filteredData = jsonData.filter((row: any[]) => 
        row && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
      );
      
      console.log('XLSParser: Загружено строк через xlsx:', filteredData.length);
      
      return filteredData;
    } catch (error) {
      console.error('XLSParser: Ошибка парсинга через xlsx:', error);
      throw error;
    }
  }

  /**
   * Парсинг данных из JSON массива
   */
  private parseData(jsonData: any[][], fileName: string): ParsedFileData {
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Файл не содержит данных');
    }

    console.log('XLSParser: Общее количество строк:', jsonData.length);

    // Пытаемся найти структуру данных логгера
    const loggerStructure = this.findLoggerDataStructure(jsonData);
    
    if (loggerStructure) {
      console.log('XLSParser: Найдена структура данных логгера:', loggerStructure);
      return this.parseLoggerData(jsonData, fileName, loggerStructure);
    }

    // Если не найдена структура логгера, используем стандартный парсинг
    console.log('XLSParser: Используем стандартный парсинг');
    return this.parseStandardData(jsonData, fileName);
  }

  /**
   * Поиск структуры данных логгера в файле
   */
  private findLoggerDataStructure(jsonData: any[][]): {
    headerRow: number;
    dataStartRow: number;
    idColumn: number;
    timestampColumn: number;
    temperatureColumn: number;
    humidityColumn?: number; // Добавить опциональную колонку влажности
    deviceInfo?: {
      deviceName?: string;
      startTime?: string;
      endTime?: string;
      channels?: number;
      measurements?: number;
    };
  } | null {
    // Ищем строку с заголовками "id", "Дата/время", "Температура[°C]"
    for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      if (!row || row.length === 0) continue;

      // Ищем заголовки в разных колонках
      const idIndex = row.findIndex(cell => 
        cell && String(cell).toLowerCase().trim() === 'id'
      );
      const timestampIndex = row.findIndex(cell => 
        cell && String(cell).toLowerCase().includes('дата') && 
        String(cell).toLowerCase().includes('время')
      );
      const temperatureIndex = row.findIndex(cell => 
        cell && String(cell).toLowerCase().includes('температура')
      );
      
      // Ищем колонку с влажностью (опционально)
      const humidityIndex = row.findIndex(cell => 
        cell && (String(cell).toLowerCase().includes('влажность') || 
                 String(cell).toLowerCase().includes('humidity') ||
                 String(cell).toLowerCase().includes('rh'))
      );

      if (idIndex !== -1 && timestampIndex !== -1 && temperatureIndex !== -1) {
        console.log('XLSParser: Найдены заголовки в строке', rowIndex + 1, {
          id: idIndex,
          timestamp: timestampIndex,
          temperature: temperatureIndex,
          humidity: humidityIndex !== -1 ? humidityIndex : undefined
        });

        // Извлекаем информацию об устройстве из верхних строк
        const deviceInfo = this.extractDeviceInfo(jsonData, rowIndex);

        return {
          headerRow: rowIndex,
          dataStartRow: rowIndex + 1,
          idColumn: idIndex,
          timestampColumn: timestampIndex,
          temperatureColumn: temperatureIndex,
          humidityColumn: humidityIndex !== -1 ? humidityIndex : undefined, // Добавить колонку влажности
          deviceInfo
        };
      }
    }

    return null;
  }

  /**
   * Извлечение информации об устройстве из верхних строк
   */
  private extractDeviceInfo(jsonData: any[][], headerRow: number): any {
    const deviceInfo: any = {};

    // Ищем информацию в строках выше заголовков
    for (let i = 0; i < headerRow && i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      // Ищем метки устройств
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        
        if (cell.includes('Название прибора') && j + 1 < row.length) {
          deviceInfo.deviceName = String(row[j + 1] || '').trim();
        } else if (cell.includes('Время запуска') && j + 1 < row.length) {
          deviceInfo.startTime = String(row[j + 1] || '').trim();
        } else if (cell.includes('Время окончания') && j + 1 < row.length) {
          deviceInfo.endTime = String(row[j + 1] || '').trim();
        } else if (cell.includes('Каналы измерения') && j + 1 < row.length) {
          deviceInfo.channels = parseInt(String(row[j + 1] || '0'));
        } else if (cell.includes('Измеренные значения') && j + 1 < row.length) {
          deviceInfo.measurements = parseInt(String(row[j + 1] || '0'));
        }
      }
    }

    return deviceInfo;
  }

  /**
   * Парсинг данных логгера
   */
  private parseLoggerData(jsonData: any[][], fileName: string, structure: any): ParsedFileData {
    const measurements: MeasurementRecord[] = [];
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    console.log('XLSParser: Начинаем парсинг данных логгера с строки', structure.dataStartRow + 1);

    // Парсим данные начиная с dataStartRow
    for (let i = structure.dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;

      try {
        const measurement = this.parseLoggerRow(row, structure);
        if (measurement) {
          measurements.push(measurement);
          
          // Обновляем диапазон дат
          if (!startDate || measurement.timestamp < startDate) {
            startDate = measurement.timestamp;
          }
          if (!endDate || measurement.timestamp > endDate) {
            endDate = measurement.timestamp;
          }
        }
      } catch (error) {
        console.warn(`XLSParser: Ошибка парсинга строки ${i + 1}:`, error);
        // Продолжаем обработку остальных строк
      }
    }

    if (measurements.length === 0) {
      throw new Error('Не удалось извлечь ни одной записи измерения из данных логгера');
    }

    // Создаем метаданные устройства
    const deviceMetadata: DeviceMetadata = {
      deviceType: 0,
      serialNumber: structure.deviceInfo?.deviceName || 'Не указан',
      deviceModel: 'Data Logger',
      firmwareVersion: structure.deviceInfo?.channels ? `Channels: ${structure.deviceInfo.channels}` : undefined
    };

    console.log('XLSParser: Парсинг данных логгера завершен:', {
      recordCount: measurements.length,
      startDate,
      endDate,
      deviceInfo: structure.deviceInfo
    });

    return {
      fileName,
      deviceMetadata,
      measurements,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      recordCount: measurements.length,
      parsingStatus: 'completed'
    };
  }

  /**
   * Парсинг строки данных логгера
   */
  private parseLoggerRow(row: any[], structure: any): MeasurementRecord | null {
    try {
      // Получаем ID (для валидации)
      const idValue = row[structure.idColumn];
      if (idValue === null || idValue === undefined || idValue === '') {
        return null; // Пропускаем пустые строки
      }

      // Получаем дату/время
      const timestampValue = row[structure.timestampColumn];
      if (!timestampValue) {
        throw new Error('Отсутствует значение даты/времени');
      }

      const timestamp = this.parseDateTime(timestampValue);

      // Получаем температуру
      const temperatureValue = row[structure.temperatureColumn];
      if (temperatureValue === null || temperatureValue === undefined || temperatureValue === '') {
        throw new Error('Отсутствует значение температуры');
      }

      const temperature = this.parseNumber(temperatureValue);
      if (temperature === null) {
        throw new Error('Не удалось извлечь значение температуры');
      }

      // Получаем влажность (если есть)
      let humidity: number | undefined;
      if (structure.humidityColumn !== undefined && structure.humidityColumn !== null) {
        const humidityValue = row[structure.humidityColumn];
        if (humidityValue !== null && humidityValue !== undefined && humidityValue !== '') {
          humidity = this.parseNumber(humidityValue) || undefined;
        }
      }

      // Валидация данных
      const validationErrors: string[] = [];
      
      if (temperature < -50 || temperature > 100) {
        validationErrors.push(`Температура вне допустимого диапазона: ${temperature}°C`);
      }
      
      if (humidity !== undefined && (humidity < 0 || humidity > 100)) {
        validationErrors.push(`Влажность вне допустимого диапазона: ${humidity}%`);
      }

      return {
        timestamp,
        temperature,
        humidity, // Использовать реальное значение влажности вместо undefined
        isValid: validationErrors.length === 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error) {
      console.warn('XLSParser: Ошибка парсинга строки логгера:', error);
      return null;
    }
  }

  /**
   * Стандартный парсинг данных (для файлов без структуры логгера)
   */
  private parseStandardData(jsonData: any[][], fileName: string): ParsedFileData {
    // Определяем заголовки (первая строка)
    const headers = jsonData[0] as string[];
    console.log('XLSParser: Заголовки (стандартный парсинг):', headers);

    // Ищем индексы колонок
    const columnIndexes = this.findColumnIndexes(headers);
    console.log('XLSParser: Индексы колонок (стандартный парсинг):', columnIndexes);

    if (!columnIndexes.timestamp && !columnIndexes.date && !columnIndexes.time) {
      throw new Error('Не найдена колонка с датой/временем');
    }

    if (!columnIndexes.temperature) {
      throw new Error('Не найдена колонка с температурой');
    }

    // Парсим данные (пропускаем заголовок)
    const measurements: MeasurementRecord[] = [];
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0) continue;

      try {
        const measurement = this.parseRow(row, columnIndexes);
        if (measurement) {
          measurements.push(measurement);
          
          // Обновляем диапазон дат
          if (!startDate || measurement.timestamp < startDate) {
            startDate = measurement.timestamp;
          }
          if (!endDate || measurement.timestamp > endDate) {
            endDate = measurement.timestamp;
          }
        }
      } catch (error) {
        console.warn(`XLSParser: Ошибка парсинга строки ${i + 1}:`, error);
        // Продолжаем обработку остальных строк
      }
    }

    if (measurements.length === 0) {
      throw new Error('Не удалось извлечь ни одной записи измерения');
    }

    return {
      fileName,
      deviceMetadata: {
        deviceType: 0,
        serialNumber: 'Не указан',
        deviceModel: 'Excel Data Logger'
      },
      measurements,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      recordCount: measurements.length,
      parsingStatus: 'completed'
    };
  }

  /**
   * Поиск индексов колонок по заголовкам
   */
  private findColumnIndexes(headers: string[]): {
    timestamp?: number;
    date?: number;
    time?: number;
    temperature?: number;
    humidity?: number;
  } {
    const indexes: any = {};

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Поиск колонки с датой/временем
      if (lowerHeader.includes('время') || lowerHeader.includes('time') || 
          lowerHeader.includes('дата') || lowerHeader.includes('date') ||
          lowerHeader.includes('timestamp')) {
        if (lowerHeader.includes('время') || lowerHeader.includes('time') || lowerHeader.includes('timestamp')) {
          indexes.timestamp = index;
        } else if (lowerHeader.includes('дата') || lowerHeader.includes('date')) {
          indexes.date = index;
        }
      }
      
      // Поиск колонки с временем (если дата и время разделены)
      if (lowerHeader.includes('время') && !lowerHeader.includes('дата')) {
        indexes.time = index;
      }
      
      // Поиск колонки с температурой
      if (lowerHeader.includes('температура') || lowerHeader.includes('temp') || 
          lowerHeader.includes('t°') || lowerHeader.includes('°c') ||
          lowerHeader.includes('°с')) {
        indexes.temperature = index;
      }
      
      // Поиск колонки с влажностью
      if (lowerHeader.includes('влажность') || lowerHeader.includes('humidity') || 
          lowerHeader.includes('rh') || lowerHeader.includes('%')) {
        indexes.humidity = index;
      }
    });

    return indexes;
  }

  /**
   * Парсинг одной строки данных
   */
  private parseRow(row: any[], columnIndexes: any): MeasurementRecord | null {
    try {
      // Получаем дату/время
      let timestamp: Date;
      
      if (columnIndexes.timestamp) {
        // Единая колонка с датой и временем
        const dateTimeValue = row[columnIndexes.timestamp];
        timestamp = this.parseDateTime(dateTimeValue);
      } else if (columnIndexes.date && columnIndexes.time) {
        // Раздельные колонки даты и времени
        const dateValue = row[columnIndexes.date];
        const timeValue = row[columnIndexes.time];
        timestamp = this.parseDateTime(dateValue, timeValue);
      } else if (columnIndexes.date) {
        // Только дата
        const dateValue = row[columnIndexes.date];
        timestamp = this.parseDateTime(dateValue);
      } else {
        throw new Error('Не найдена колонка с датой/временем');
      }

      // Получаем температуру
      const temperatureValue = row[columnIndexes.temperature];
      const temperature = this.parseNumber(temperatureValue);
      
      if (temperature === null) {
        throw new Error('Не удалось извлечь значение температуры');
      }

      // Получаем влажность (если есть)
      let humidity: number | undefined;
      if (columnIndexes.humidity) {
        const humidityValue = row[columnIndexes.humidity];
        humidity = this.parseNumber(humidityValue) || undefined;
      }

      // Валидация данных
      const validationErrors: string[] = [];
      
      if (temperature < -50 || temperature > 100) {
        validationErrors.push(`Температура вне допустимого диапазона: ${temperature}°C`);
      }
      
      if (humidity !== undefined && (humidity < 0 || humidity > 100)) {
        validationErrors.push(`Влажность вне допустимого диапазона: ${humidity}%`);
      }

      return {
        timestamp,
        temperature,
        humidity,
        isValid: validationErrors.length === 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error) {
      console.warn('XLSParser: Ошибка парсинга строки:', error);
      return null;
    }
  }

  /**
   * Парсинг даты и времени
   */
  private parseDateTime(dateValue: any, timeValue?: any): Date {
    try {
      // Если это уже объект Date
      if (dateValue instanceof Date) {
        return dateValue;
      }

      // Если это число (Excel serial date)
      if (typeof dateValue === 'number') {
        // Excel использует 1900-01-01 как базовую дату, но с ошибкой високосного года
        const excelEpoch = new Date(1900, 0, 1);
        const days = Math.floor(dateValue);
        const time = (dateValue - days) * 24 * 60 * 60 * 1000;
        
        // Корректировка для ошибки Excel (1900 считается високосным годом)
        const correctedDays = days > 59 ? days - 1 : days;
        
        return new Date(excelEpoch.getTime() + correctedDays * 24 * 60 * 60 * 1000 + time);
      }

      // Если это строка
      if (typeof dateValue === 'string') {
        let dateStr = dateValue.trim();
        
        // Если есть отдельное время, объединяем
        if (timeValue !== undefined && timeValue !== null) {
          const timeStr = String(timeValue).trim();
          dateStr = `${dateStr} ${timeStr}`;
        }

        // Сначала пробуем парсинг с помощью регулярных выражений для точного контроля
        const dateTimeRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
        const dateOnlyRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
        
        // Проверяем формат DD.MM.YYYY H:MM:SS или DD.MM.YYYY HH:MM:SS
        const dateTimeMatch = dateStr.match(dateTimeRegex);
        if (dateTimeMatch) {
          const [, day, month, year, hour, minute, second] = dateTimeMatch;
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1, // месяцы в JS начинаются с 0
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
          
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Проверяем формат DD.MM.YYYY
        const dateOnlyMatch = dateStr.match(dateOnlyRegex);
        if (dateOnlyMatch) {
          const [, day, month, year] = dateOnlyMatch;
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
          
          if (!isNaN(date.getTime())) {
            return date;
          }
        }

        // Пробуем различные форматы
        const formats = [
          'DD.MM.YYYY HH:mm:ss',
          'DD.MM.YYYY HH:mm',
          'DD.MM.YYYY',
          'YYYY-MM-DD HH:mm:ss',
          'YYYY-MM-DD HH:mm',
          'YYYY-MM-DD',
          'MM/DD/YYYY HH:mm:ss',
          'MM/DD/YYYY HH:mm',
          'MM/DD/YYYY'
        ];

        for (const format of formats) {
          try {
            // Простая попытка парсинга (можно улучшить с помощью библиотеки date-fns)
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date;
            }
          } catch (e) {
            // Продолжаем с следующим форматом
          }
        }

        // Если ничего не сработало, пробуем стандартный парсер
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error(`Не удалось распарсить дату: ${dateStr}`);
        }
        return date;
      }

      throw new Error(`Неподдерживаемый тип данных для даты: ${typeof dateValue}`);

    } catch (error) {
      console.error('XLSParser: Ошибка парсинга даты:', error);
      throw new Error(`Ошибка парсинга даты: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Парсинг числового значения
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      // Убираем пробелы
      let cleanValue = value.trim();
      
      // Заменяем запятую на точку для правильного парсинга
      // Это важно для русской локали, где используется запятая как разделитель десятичных знаков
      cleanValue = cleanValue.replace(',', '.');
      
      const num = parseFloat(cleanValue);
      return isNaN(num) ? null : num;
    }

    return null;
  }

  /**
   * Конвертация листа Excel в массив массивов (аналог XLSX.utils.sheet_to_json с header: 1)
   */
  private worksheetToArray(worksheet: ExcelJS.Worksheet): any[][] {
    const result: any[][] = [];
    
    // Получаем количество строк и столбцов
    const rowCount = worksheet.rowCount || 0;
    const columnCount = worksheet.columnCount || 0;
    
    // Проходим по всем строкам
    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData: any[] = [];
      
      // Проходим по всем ячейкам в строке
      for (let colNumber = 1; colNumber <= columnCount; colNumber++) {
        const cell = row.getCell(colNumber);
        
        // Получаем значение ячейки
        let value: any = cell.value;
        
        // Обрабатываем разные типы значений
        if (value === null || value === undefined) {
          value = null;
        } else if (typeof value === 'object') {
          // Если это объект (например, формула, дата и т.д.)
          if (value instanceof Date) {
            value = value;
          } else if (value.text !== undefined) {
            // Если это rich text, берем текст
            value = value.text;
          } else if (value.result !== undefined) {
            // Если это формула, берем результат
            value = value.result;
          } else {
            // Иначе берем строковое представление
            value = String(value);
          }
        }
        
        rowData.push(value);
      }
      
      // Добавляем строку только если в ней есть хотя бы одно непустое значение
      if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        result.push(rowData);
      }
    }
    
    return result;
  }
}
