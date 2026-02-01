import { parseXLSFile } from '../xlsParser';

// Mock для XLSX
const mockXLSX = {
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
};

jest.mock('xlsx', () => mockXLSX);

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
      { 'ID': 1, 'Timestamp': '2023-01-01 00:00:00', 'Temperature': 20.5, 'Humidity': 60.0 },
      { 'ID': 2, 'Timestamp': '2023-01-01 01:00:00', 'Temperature': 21.0, 'Humidity': 58.0 }
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result).toEqual({
      fileName: 'test.xls',
      recordCount: 2,
      startDate: expect.any(Date),
      endDate: expect.any(Date),
      deviceMetadata: expect.any(Object),
      measurements: expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          timestamp: expect.any(Date),
          temperature: 20.5,
          humidity: 60.0,
          isValid: true
        }),
        expect.objectContaining({
          id: 2,
          timestamp: expect.any(Date),
          temperature: 21.0,
          humidity: 58.0,
          isValid: true
        })
      ])
    });

    expect(mockXLSX.read).toHaveBeenCalledWith(expect.any(ArrayBuffer), { type: 'array' });
    expect(mockXLSX.utils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, { header: 1 });
  });

  test('handles file with no data', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue([]);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result).toEqual({
      fileName: 'test.xls',
      recordCount: 0,
      startDate: null,
      endDate: null,
      deviceMetadata: {},
      measurements: []
    });
  });

  test('handles file with invalid data format', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      ['Invalid', 'Data', 'Format'],
      ['No', 'Proper', 'Structure']
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result).toEqual({
      fileName: 'test.xls',
      recordCount: 0,
      startDate: null,
      endDate: null,
      deviceMetadata: {},
      measurements: []
    });
  });

  test('handles file with missing columns', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      { 'ID': 1, 'Timestamp': '2023-01-01 00:00:00' }, // Missing Temperature and Humidity
      { 'ID': 2, 'Timestamp': '2023-01-01 01:00:00', 'Temperature': 21.0 } // Missing Humidity
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result.measurements).toHaveLength(2);
    expect(result.measurements[0]).toEqual({
      id: 1,
      timestamp: expect.any(Date),
      temperature: null,
      humidity: null,
      isValid: false
    });
    expect(result.measurements[1]).toEqual({
      id: 2,
      timestamp: expect.any(Date),
      temperature: 21.0,
      humidity: null,
      isValid: false
    });
  });

  test('handles file with invalid timestamp format', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      { 'ID': 1, 'Timestamp': 'invalid-date', 'Temperature': 20.5, 'Humidity': 60.0 },
      { 'ID': 2, 'Timestamp': '2023-01-01 01:00:00', 'Temperature': 21.0, 'Humidity': 58.0 }
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result.measurements).toHaveLength(2);
    expect(result.measurements[0].isValid).toBe(false);
    expect(result.measurements[1].isValid).toBe(true);
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
      { 'ID': 1, 'Timestamp': '2023-01-01 00:00:00', 'Temperature': 20.5, 'Humidity': 60.0 }
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result.recordCount).toBe(1);
    expect(mockXLSX.utils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Sheet1, { header: 1 });
  });

  test('handles file reading error', async () => {
    mockXLSX.read.mockImplementation(() => {
      throw new Error('File reading error');
    });

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await expect(parseXLSFile(file)).rejects.toThrow('File reading error');
  });

  test('handles file with very large dataset', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    // Создаем большой набор данных
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      'ID': i + 1,
      'Timestamp': `2023-01-01 ${(i % 24).toString().padStart(2, '0')}:00:00`,
      'Temperature': 20 + Math.sin(i / 100) * 5,
      'Humidity': 60 + Math.cos(i / 100) * 10
    }));

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(largeData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result.recordCount).toBe(10000);
    expect(result.measurements).toHaveLength(10000);
  });

  test('handles file with special characters in data', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockData = [
      { 'ID': 1, 'Timestamp': '2023-01-01 00:00:00', 'Temperature': 20.5, 'Humidity': 60.0 },
      { 'ID': 2, 'Timestamp': '2023-01-01 01:00:00', 'Temperature': 'N/A', 'Humidity': '∞' }
    ];

    mockXLSX.read.mockReturnValue(mockWorkbook);
    mockXLSX.utils.sheet_to_json.mockReturnValue(mockData);

    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    const result = await parseXLSFile(file);

    expect(result.measurements).toHaveLength(2);
    expect(result.measurements[0].isValid).toBe(true);
    expect(result.measurements[1].isValid).toBe(false);
  });
});



















