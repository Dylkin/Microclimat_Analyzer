import { DeviceMetadata, MeasurementRecord, ParsedFileData } from '../types/FileData';
import { Testo174HBinaryParser } from './testo174hBinaryParser';
import { Testo174TBinaryParser } from './testo174tBinaryParser';

/**
 * Универсальный парсер для файлов VI2
 * Автоматически определяет тип устройства и выбирает подходящий парсер
 */
class VI2Parser {
  private buffer: ArrayBuffer;
  private view: DataView;
  
  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  /**
   * Основной метод парсинга - определяет тип устройства и запускает соответствующий парсер
   */
  async parse(fileName: string): Promise<ParsedFileData> {
    try {
      console.log('Начинаем анализ VI2 файла:', fileName);
      console.log('Размер файла:', this.buffer.byteLength, 'байт');

      // Определяем тип устройства
      const deviceType = this.detectDeviceType();
      console.log('Определен тип устройства:', deviceType);

      // Выбираем и запускаем соответствующий парсер
      switch (deviceType) {
        case 1:
          console.log('Запускаем парсер для одноканального устройства (Testo 174T)');
          const parser174T = new Testo174TBinaryParser(this.buffer);
          return parser174T.parse(fileName);
          
        case 2:
          console.log('Запускаем парсер для двухканального устройства (Testo 174H)');
          const parser174H = new Testo174HBinaryParser(this.buffer);
          return parser174H.parse(fileName);
          
        default:
          console.warn('Неизвестный тип устройства, используем парсер по умолчанию (двухканальный)');
          const defaultParser = new Testo174HBinaryParser(this.buffer);
          return defaultParser.parse(fileName);
      }

    } catch (error) {
      console.error('Ошибка парсинга VI2 файла:', error);
      return {
        fileName,
        deviceMetadata: {
          deviceType: 0,
          deviceModel: 'Unknown',
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
   * Определение типа устройства по содержимому файла
   */
  private detectDeviceType(): number {
    try {
      // Ищем строку "DeviceType" в hex dump
      const deviceTypeOffset = this.findHexPattern('44 65 76 69 63 65 54 79 70 65 09');
      
      if (deviceTypeOffset === -1) {
        console.warn('Паттерн DeviceType не найден, используем определение по умолчанию');
        return this.detectDeviceTypeByFallback();
      }

      console.log('Найден паттерн DeviceType на смещении:', deviceTypeOffset.toString(16));

      // Читаем значение после паттерна "DeviceType\t"
      const valueOffset = deviceTypeOffset + 11; // длина "DeviceType\t"
      
      if (valueOffset >= this.buffer.byteLength) {
        console.warn('Смещение значения DeviceType выходит за границы файла');
        return this.detectDeviceTypeByFallback();
      }

      // Читаем следующий байт как ASCII символ
      const deviceTypeByte = this.view.getUint8(valueOffset);
      
      if (deviceTypeByte === 0x31) { // ASCII '1'
        console.log('Обнаружен DeviceType = 1 (одноканальный)');
        return 1;
      } else if (deviceTypeByte === 0x32) { // ASCII '2'
        console.log('Обнаружен DeviceType = 2 (двухканальный)');
        return 2;
      } else {
        console.warn('Неожиданное значение DeviceType:', deviceTypeByte.toString(16));
        return this.detectDeviceTypeByFallback();
      }

    } catch (error) {
      console.error('Ошибка определения типа устройства:', error);
      return this.detectDeviceTypeByFallback();
    }
  }

  /**
   * Поиск hex паттерна в файле
   */
  private findHexPattern(hexPattern: string): number {
    // Преобразуем hex строку в массив байтов
    const patternBytes = hexPattern.split(' ').map(hex => parseInt(hex, 16));
    
    // Ищем паттерн в файле
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
   * Резервный метод определения типа устройства
   * Используется если основной метод не сработал
   */
  private detectDeviceTypeByFallback(): number {
    try {
      // Пытаемся найти строку "DeviceType" обычным поиском
      const deviceTypeStringOffset = this.findString('DeviceType');
      
      if (deviceTypeStringOffset !== -1) {
        const valueStart = deviceTypeStringOffset + 11; // длина "DeviceType\t"
        const deviceTypeStr = this.readNullTerminatedString(valueStart);
        const deviceType = parseInt(deviceTypeStr);
        
        if (deviceType === 1 || deviceType === 2) {
          console.log('Резервный метод: определен DeviceType =', deviceType);
          return deviceType;
        }
      }

      // Если ничего не найдено, пытаемся определить по структуре данных
      console.log('Используем эвристический анализ структуры файла');
      return this.detectDeviceTypeByStructure();

    } catch (error) {
      console.error('Ошибка резервного определения типа устройства:', error);
      return 2; // По умолчанию двухканальный
    }
  }

  /**
   * Определение типа устройства по структуре данных
   */
  private detectDeviceTypeByStructure(): number {
    try {
      // Анализируем область данных (обычно начинается с 0x0C00)
      const dataStartOffset = 0x0C00;
      
      if (dataStartOffset >= this.buffer.byteLength) {
        return 2; // По умолчанию
      }

      // Проверяем несколько записей на предмет структуры
      let singleChannelCount = 0;
      let dualChannelCount = 0;

      for (let i = 0; i < 10 && (dataStartOffset + i * 12) < this.buffer.byteLength; i++) {
        const offset = dataStartOffset + i * 12;
        
        // Читаем потенциальные значения температуры и влажности
        const temp = this.view.getFloat32(offset + 4, true);
        const humidity = this.view.getFloat32(offset + 8, true);
        
        // Проверяем валидность значений
        const tempValid = !isNaN(temp) && temp > -50 && temp < 100;
        const humidityValid = !isNaN(humidity) && humidity >= 0 && humidity <= 100;
        
        if (tempValid && humidityValid) {
          dualChannelCount++;
        } else if (tempValid && !humidityValid) {
          singleChannelCount++;
        }
      }

      console.log('Анализ структуры: одноканальных записей =', singleChannelCount, ', двухканальных =', dualChannelCount);

      // Если больше одноканальных записей, то это одноканальное устройство
      if (singleChannelCount > dualChannelCount) {
        return 1;
      } else {
        return 2;
      }

    } catch (error) {
      console.error('Ошибка анализа структуры:', error);
      return 2; // По умолчанию двухканальный
    }
  }

  /**
   * Поиск строки в буфере (вспомогательный метод)
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
   * Чтение строки до нулевого символа (вспомогательный метод)
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
 * Сервис для парсинга VI2 файлов с автоматическим определением типа
 */
export class VI2ParsingService {
  async parseFile(file: File): Promise<ParsedFileData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parser = new VI2Parser(buffer);
          const result = await parser.parse(file.name);
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