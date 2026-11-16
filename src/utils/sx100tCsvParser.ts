import { MeasurementRecord, ParsedFileData } from '../types/FileData';

/**
 * Парсер для CSV-файлов данных логгеров SX100-T (тип «SX100-T PDF»).
 *
 * Формат файла (экспорт ПО логгера, кодировка CP1251 или UTF-8):
 * - служебный заголовок с параметрами устройства («Тип логгера», «Серийный номер», «Версия прошивки» и т.д.);
 * - секция данных со строками вида «13:20:00 12.11.2026;24,9» (дата/время;температура с десятичной запятой).
 *
 * Пример имени файла: OK_301_110000057426_131126_1523_S01.csv
 */
export class SX100TCsvParser {
  /** Допустимый диапазон температур для валидации записей, °C */
  private static readonly TEMPERATURE_MIN = -100;
  private static readonly TEMPERATURE_MAX = 100;

  /**
   * Распознаёт, является ли CSV-файл файлом данных SX100-T
   * (проверяет наличие маркера «Тип логгера … SX100-T» в содержимом).
   */
  static isSX100TFile(text: string): boolean {
    return /SX100-T/.test(text) && /Тип логгера/i.test(text);
  }

  async parseFile(file: File): Promise<ParsedFileData> {
    console.log('SX100TCsvParser: Начинаем анализ CSV файла:', file.name);

    const buffer = await this.readFileBuffer(file);
    const text = this.decodeText(buffer);

    if (!SX100TCsvParser.isSX100TFile(text)) {
      throw new Error('CSV-файл не является файлом данных логгера SX100-T');
    }

    const deviceMetadata = this.parseDeviceMetadata(text);
    const measurements = this.parseMeasurements(text);

    if (measurements.length === 0) {
      throw new Error('В файле не найдены записи измерений SX100-T');
    }

    const startDate = measurements[0].timestamp;
    const endDate = measurements[measurements.length - 1].timestamp;

    const parsedData: ParsedFileData = {
      fileName: file.name,
      deviceMetadata,
      measurements,
      startDate,
      endDate,
      recordCount: measurements.length,
      parsingStatus: 'completed',
      errorMessage: undefined
    };

    console.log('SX100TCsvParser: Парсинг завершен:', {
      fileName: parsedData.fileName,
      deviceModel: deviceMetadata.deviceModel,
      serialNumber: deviceMetadata.serialNumber,
      recordCount: parsedData.recordCount,
      startDate: parsedData.startDate,
      endDate: parsedData.endDate
    });

    return parsedData;
  }

  /**
   * Читает файл в ArrayBuffer. В современных браузерах используется Blob.arrayBuffer,
   * иначе — fallback через FileReader (старые браузеры, тестовые окружения).
   */
  private readFileBuffer(file: File): Promise<ArrayBuffer> {
    if (typeof file.arrayBuffer === 'function') {
      return file.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Декодирует содержимое файла: сначала пробуем UTF-8, затем CP1251
   * (экспорт ПО SX100-T по умолчанию сохраняется в CP1251).
   */
  private decodeText(buffer: ArrayBuffer): string {
    const utf8Text = new TextDecoder('utf-8').decode(buffer);
    if (SX100TCsvParser.isSX100TFile(utf8Text)) {
      return utf8Text;
    }
    const cp1251Text = new TextDecoder('windows-1251').decode(buffer);
    if (SX100TCsvParser.isSX100TFile(cp1251Text)) {
      return cp1251Text;
    }
    // Возвращаем CP1251-вариант — дальше будет понятное сообщение об ошибке формата
    return cp1251Text;
  }

  /**
   * Читает параметры устройства из служебного заголовка:
   * модель («Тип логгера :; SX100-T PDF»), серийный номер, версию прошивки.
   */
  private parseDeviceMetadata(text: string): ParsedFileData['deviceMetadata'] {
    const modelMatch = text.match(/Тип логгера\s*:\s*;\s*([^\r\n;]+)/i);
    const serialMatch = text.match(/Серийный номер\s*:\s*;\s*(\S+)/i);
    const firmwareMatch = text.match(/Версия прошивки\s*:\s*;\s*(\S+)/i);

    return {
      deviceType: 0,
      serialNumber: serialMatch ? serialMatch[1].trim() : 'UNKNOWN',
      deviceModel: modelMatch ? modelMatch[1].trim() : 'SX100-T PDF',
      firmwareVersion: firmwareMatch ? firmwareMatch[1].trim() : undefined
    };
  }

  /**
   * Парсит строки измерений вида «13:20:00 12.11.2026;24,9».
   * Строки, не подходящие под формат, пропускаются; температура вне допустимого
   * диапазона помечается как невалидная.
   */
  private parseMeasurements(text: string): MeasurementRecord[] {
    const measurements: MeasurementRecord[] = [];
    const rowRegex = /^\s*(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\s*;\s*(-?\d+(?:[.,]\d+)?)\s*$/;

    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(rowRegex);
      if (!match) continue;

      const [, hh, mm, ss, dd, mo, yy, rawTemp] = match;
      // Локальное время логгера: «13:20:00 12.11.2026» → 12.11.2026 13:20:00
      const timestamp = new Date(Number(yy), Number(mo) - 1, Number(dd), Number(hh), Number(mm), Number(ss));
      if (isNaN(timestamp.getTime())) continue;

      const temperature = Number(rawTemp.replace(',', '.'));
      const isValid =
        Number.isFinite(temperature) &&
        temperature >= SX100TCsvParser.TEMPERATURE_MIN &&
        temperature <= SX100TCsvParser.TEMPERATURE_MAX;

      measurements.push({
        timestamp,
        temperature: isValid ? temperature : NaN,
        isValid,
        validationErrors: isValid ? undefined : [`Температура вне допустимого диапазона: ${rawTemp}`]
      });
    }

    return measurements;
  }
}
