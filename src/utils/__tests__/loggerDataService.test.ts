import { loggerDataService } from '../loggerDataService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('LoggerDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when apiClient is available', () => {
      expect(loggerDataService.isAvailable()).toBe(true);
    });
  });

  describe('saveLoggerData', () => {
    test('saves logger data successfully', async () => {
      const parsedData = {
        fileName: 'test.xls',
        deviceMetadata: {
          deviceType: 1,
          deviceModel: 'DL-019',
          serialNumber: 'SN123'
        },
        measurements: [
          {
            timestamp: new Date('2023-01-01T00:00:00Z'),
            temperature: 20.5,
            humidity: 60.0,
            isValid: true
          }
        ],
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-01-02T00:00:00Z'),
        recordCount: 1,
        parsingStatus: 'completed' as const
      };

      mockApiClient.post = jest.fn().mockResolvedValue({
        success: true,
        recordCount: 1
      });

      const result = await loggerDataService.saveLoggerData(
        'test-project-id',
        'test-object-id',
        1,
        0.2,
        'DL-019',
        parsedData as any
      );
      
      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);
    });

    test('handles api error', async () => {
      mockApiClient.post = jest.fn().mockRejectedValue(new Error('Save error'));

      const result = await loggerDataService.saveLoggerData(
        'test-project-id',
        'test-object-id',
        1,
        0.2,
        'DL-019',
        {
          fileName: 'test.xls',
          deviceMetadata: {},
          measurements: [],
          startDate: new Date(),
          endDate: new Date(),
          recordCount: 0,
          parsingStatus: 'error'
        } as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save error');
    });
  });

  describe('getLoggerDataSummary', () => {
    test('returns logger data summary', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue([]);

      const result = await loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id');
      
      expect(result).toEqual([]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/logger-data/summary?project_id=test-project-id&qualification_object_id=test-object-id');
    });

    test('handles api error', async () => {
      mockApiClient.get = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(loggerDataService.getLoggerDataSummary('test-project-id', 'test-object-id'))
        .rejects.toThrow('Ошибка получения сводной информации: Database error');
    });
  });

  describe('getLoggerData', () => {
    test('returns logger data', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue([]);

      const result = await loggerDataService.getLoggerData('test-project-id', 'test-object-id', 1, 0.2);
      
      expect(result).toEqual([]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/logger-data?project_id=test-project-id&qualification_object_id=test-object-id&zone_number=1&measurement_level=0.2'
      );
    });
  });

  describe('deleteLoggerData', () => {
    test('deletes logger data', async () => {
      mockApiClient.delete = jest.fn().mockResolvedValue({ success: true });

      const result = await loggerDataService.deleteLoggerData('test-project-id', 'test-object-id', 'test.xls');
      
      expect(result.success).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/logger-data?project_id=test-project-id&qualification_object_id=test-object-id&file_name=test.xls'
      );
    });
  });
});
