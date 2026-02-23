import { loggerDataService } from '../loggerDataService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

const summaryResponse = {
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
};

describe('LoggerDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.post.mockResolvedValue({ success: true, recordCount: 1000 });
    mockApi.get.mockResolvedValue([]);
  });

  describe('isAvailable', () => {
    test('returns true when API is available', () => {
      expect(loggerDataService.isAvailable()).toBe(true);
    });
  });

  describe('saveLoggerData', () => {
    test('saves logger data successfully', async () => {
      const parsedData = {
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
        endDate: new Date('2023-01-02T00:00:00Z'),
        recordCount: 1000
      };

      const result = await loggerDataService.saveLoggerData(
        'test-project-id',
        'test-object-id',
        1,
        0.2,
        'DL-019',
        parsedData
      );

      expect(result.success).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/logger-data/save', expect.any(Object));
    });

    test('handles API error during save', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Summary save error'));

      const parsedData = {
        fileName: 'test.xls',
        deviceMetadata: { deviceType: 'Logger', deviceModel: 'DL-019', serialNumber: 'SN123' },
        measurements: [],
        startDate: new Date(),
        endDate: new Date(),
        recordCount: 0
      };

      const result = await loggerDataService.saveLoggerData(
        'test-project-id',
        'test-object-id',
        1,
        0.2,
        'DL-019',
        parsedData
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Summary save error');
    });
  });

  describe('getLoggerDataSummary', () => {
    test('returns logger data summary', async () => {
      const result = await loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('logger-data/summary'));
    });

    test('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Database error'));

      await expect(loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id'))
        .rejects.toThrow();
    });
  });

  describe('getLoggerData', () => {
    test('returns logger data', async () => {
      const result = await loggerDataService.getLoggerData(
        'test-project-id',
        'test-object-id'
      );

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/logger-data'));
    });
  });
});
