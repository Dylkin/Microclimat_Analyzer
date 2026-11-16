import * as fs from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';
import { SX100TCsvParser } from '../sx100tCsvParser';

// jsdom не предоставляет TextDecoder — подключаем нодовскую реализацию (полный ICU, windows-1251 поддерживается)
(global as any).TextDecoder = TextDecoder;

const EXAMPLE_FILE_PATH = path.join(
  process.cwd(),
  'uploads/OK_301_110000057426_131126_1523_S01.csv'
);

async function loadExampleFile(): Promise<File> {
  const buffer = fs.readFileSync(EXAMPLE_FILE_PATH);
  return new File([new Uint8Array(buffer)], 'OK_301_110000057426_131126_1523_S01.csv', {
    type: 'text/csv'
  });
}

describe('SX100TCsvParser', () => {
  it('парсит файл данных SX100-T (CP1251): метаданные, 1561 запись, первое и последнее измерение', async () => {
    const file = await loadExampleFile();
    const parser = new SX100TCsvParser();

    const result = await parser.parseFile(file);

    expect(result.parsingStatus).toBe('completed');
    expect(result.errorMessage).toBeUndefined();

    // Метаданные устройства из заголовка файла
    expect(result.deviceMetadata.deviceModel).toBe('SX100-T PDF');
    expect(result.deviceMetadata.serialNumber).toBe('110000057426');
    expect(result.deviceMetadata.firmwareVersion).toBe('01.05.29');

    // Количество записей совпадает с заголовком «Количество записанных событий: 1561»
    expect(result.recordCount).toBe(1561);
    expect(result.measurements).toHaveLength(1561);

    // Первое измерение: 13:20:00 12.11.2026;24,9
    expect(result.measurements[0].timestamp).toEqual(new Date(2026, 10, 12, 13, 20, 0));
    expect(result.measurements[0].temperature).toBe(24.9);
    expect(result.measurements[0].isValid).toBe(true);

    // Последнее измерение: 15:18:16 13.11.2026;22,5
    const last = result.measurements[result.measurements.length - 1];
    expect(last.timestamp).toEqual(new Date(2026, 10, 13, 15, 18, 16));
    expect(last.temperature).toBe(22.5);

    // Период записи
    expect(result.startDate).toEqual(result.measurements[0].timestamp);
    expect(result.endDate).toEqual(last.timestamp);

    // Все температуры из файла в допустимом диапазоне
    expect(result.measurements.every(m => m.isValid)).toBe(true);
  });

  it('отклоняет CSV-файл, не являющийся данными SX100-T', async () => {
    const file = new File(['дата;значение\n12.11.2026;24,9\n'], 'data.csv', { type: 'text/csv' });
    const parser = new SX100TCsvParser();

    await expect(parser.parseFile(file)).rejects.toThrow(
      'CSV-файл не является файлом данных логгера SX100-T'
    );
  });

  it('отклоняет пустой файл', async () => {
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    const parser = new SX100TCsvParser();

    await expect(parser.parseFile(file)).rejects.toThrow(
      'CSV-файл не является файлом данных логгера SX100-T'
    );
  });
});
