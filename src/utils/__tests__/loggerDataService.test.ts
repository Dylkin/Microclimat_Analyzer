import { loggerDataService } from '../loggerDataService';

// Mock для Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: {
            id: 'test-id',
            project_id: 'test-project-id',
            qualification_object_id: 'test-object-id',
            zone_number: 1,
            measurement_level: 0.2,
            logger_name: 'DL-019',
            file_name: 'test.xls',
            device_type: 'Logger',
            device_model: 'DL-019',
            serial_number: 'SN123',
            start_date: '2023-01-01T00:00:00Z',
            end_date: '2023-01-02T00:00:00Z',
            record_count: 1000,
            parsing_status: 'completed',
            error_message: null,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }, 
          error: null 
        }))
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ 
                data: [], 
                error: null 
              }))
            }))
          }))
        }))
      }))
    }))
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ 
        data: { path: 'test-path' }, 
        error: null 
      })),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: 'https://example.com/test-file.xls' }
      }))
    }))
  }
};

// Mock для createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('LoggerDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when supabase is available', () => {
      expect(loggerDataService.isAvailable()).toBe(true);
    });
  });

  describe('saveLoggerData', () => {
    test('saves logger data successfully', async () => {
      const loggerData = {
        projectId: 'test-project-id',
        qualificationObjectId: 'test-object-id',
        zoneNumber: 1,
        measurementLevel: 0.2,
        loggerName: 'DL-019',
        fileName: 'test.xls',
        deviceMetadata: {
          deviceType: 'Logger',
          deviceModel: 'DL-019',
          serialNumber: 'SN123'
        },
        measurements: [
          {
            id: 1,
            timestamp: new Date('2023-01-01T00:00:00Z'),
            temperature: 20.5,
            humidity: 60.0,
            isValid: true
          }
        ],
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-01-02T00:00:00Z')
      };

      const result = await loggerDataService.saveLoggerData(loggerData);
      
      expect(result).toEqual({
        id: 'test-id',
        projectId: 'test-project-id',
        qualificationObjectId: 'test-object-id',
        zoneNumber: 1,
        measurementLevel: 0.2,
        loggerName: 'DL-019',
        fileName: 'test.xls',
        deviceType: 'Logger',
        deviceModel: 'DL-019',
        serialNumber: 'SN123',
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-01-02T00:00:00Z'),
        recordCount: 1000,
        parsingStatus: 'completed',
        errorMessage: null,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      loggerDataService.supabase = null;

      await expect(loggerDataService.saveLoggerData({
        projectId: 'test-project-id',
        qualificationObjectId: 'test-object-id',
        zoneNumber: 1,
        measurementLevel: 0.2,
        loggerName: 'DL-019',
        fileName: 'test.xls',
        deviceMetadata: {
          deviceType: 'Logger',
          deviceModel: 'DL-019',
          serialNumber: 'SN123'
        },
        measurements: [],
        startDate: new Date(),
        endDate: new Date()
      }))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error during summary save', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Summary save error') 
            }))
          }))
        }))
      });

      await expect(loggerDataService.saveLoggerData({
        projectId: 'test-project-id',
        qualificationObjectId: 'test-object-id',
        zoneNumber: 1,
        measurementLevel: 0.2,
        loggerName: 'DL-019',
        fileName: 'test.xls',
        deviceMetadata: {
          deviceType: 'Logger',
          deviceModel: 'DL-019',
          serialNumber: 'SN123'
        },
        measurements: [],
        startDate: new Date(),
        endDate: new Date()
      }))
        .rejects.toThrow('Ошибка сохранения сводной информации: Summary save error');
    });
  });

  describe('getLoggerDataSummary', () => {
    test('returns logger data summary', async () => {
      const result = await loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('logger_data_summary');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      loggerDataService.supabase = null;

      await expect(loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ 
                    data: null, 
                    error: new Error('Database error') 
                  }))
                }))
              }))
            }))
          }))
        }))
      });

      await expect(loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id'))
        .rejects.toThrow('Ошибка загрузки сводной информации: Database error');
    });
  });

  describe('getLoggerDataRecords', () => {
    test('returns logger data records', async () => {
      const result = await loggerDataService.getLoggerDataRecords('test-project-id', 'test-object-id', 1, 0.2, 'test.xls');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('logger_data_records');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      loggerDataService.supabase = null;

      await expect(loggerDataService.getLoggerDataRecords('test-project-id', 'test-object-id', 1, 0.2, 'test.xls'))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('uploadLoggerFile', () => {
    test('uploads logger file successfully', async () => {
      const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });
      const result = await loggerDataService.uploadLoggerFile(file, 'test-object-id', 1, 0.2, 'DL-019');
      
      expect(result).toEqual('https://example.com/test-file.xls');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('logger-removal-files');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      loggerDataService.supabase = null;

      const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });
      await expect(loggerDataService.uploadLoggerFile(file, 'test-object-id', 1, 0.2, 'DL-019'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles upload error', async () => {
      mockSupabase.storage.from.mockReturnValueOnce({
        upload: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: new Error('Upload error') 
        }))
      });

      const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });
      await expect(loggerDataService.uploadLoggerFile(file, 'test-object-id', 1, 0.2, 'DL-019'))
        .rejects.toThrow('Ошибка загрузки файла: Upload error');
    });
  });
});


















