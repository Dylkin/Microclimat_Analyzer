import { XLSParser } from '../xlsParser';
import * as XLSX from 'xlsx';

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

const mockXLSX = XLSX as jest.Mocked<typeof XLSX>;

const createXlsBuffer = () => {
  const header = new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  return header.buffer;
};

describe('XLS Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parses XLS file successfully', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      ['ID', 'Timestamp', 'Temperature', 'Humidity'],
      [1, '2023-01-01 00:00:00', 20.5, 60.0],
      [2, '2023-01-01 01:00:00', 21.0, 58.0]
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.fileName).toBe('test.xls');
    expect(result.parsingStatus).toBe('completed');
    expect(result.recordCount).toBe(2);
    expect(result.measurements).toHaveLength(2);
  });

  test('handles file with no data', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue([] as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.parsingStatus).toBe('error');
    expect(result.recordCount).toBe(0);
    expect(result.measurements).toEqual([]);
  });

  test('handles file with invalid data format', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      ['Invalid', 'Headers'],
      ['No', 'Data']
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.parsingStatus).toBe('error');
    expect(result.recordCount).toBe(0);
  });

  test('handles file with missing humidity column', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      ['ID', 'Timestamp', 'Temperature'],
      [1, '2023-01-01 00:00:00', 20.5],
      [2, '2023-01-01 01:00:00', 21.0]
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.parsingStatus).toBe('completed');
    expect(result.recordCount).toBe(2);
    expect(result.measurements[0].humidity).toBeUndefined();
  });

  test('handles invalid timestamp format', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      ['ID', 'Timestamp', 'Temperature', 'Humidity'],
      [1, 'invalid-date', 20.5, 60.0],
      [2, '2023-01-01 01:00:00', 21.0, 58.0]
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.parsingStatus).toBe('completed');
    expect(result.recordCount).toBe(1);
  });

  test('handles file with multiple sheets', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1', 'Sheet2'],
      Sheets: {
        Sheet1: {},
        Sheet2: {}
      }
    };

    const mockData = [
      ['ID', 'Timestamp', 'Temperature', 'Humidity'],
      [1, '2023-01-01 00:00:00', 20.5, 60.0]
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook as any);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData as any);

    const parser = new XLSParser(createXlsBuffer());
    const result = await parser.parse('test.xls');

    expect(result.recordCount).toBe(1);
  });
});
