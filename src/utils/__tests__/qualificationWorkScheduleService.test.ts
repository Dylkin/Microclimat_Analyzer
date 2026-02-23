import { qualificationWorkScheduleService } from '../qualificationWorkScheduleService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('QualificationWorkScheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue([]);
    mockApi.post.mockResolvedValue([]);
    mockApi.delete.mockResolvedValue(undefined);
  });

  describe('isAvailable', () => {
    test('returns true when API is available', () => {
      expect(qualificationWorkScheduleService.isAvailable()).toBe(true);
    });
  });

  describe('getWorkSchedule', () => {
    test('returns empty array when no stages exist', async () => {
      const result = await qualificationWorkScheduleService.getWorkSchedule('test-object-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/qualification-work-schedule'));
    });

    test('filters by projectId when provided', async () => {
      const result = await qualificationWorkScheduleService.getWorkSchedule('test-object-id', 'test-project-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('project_id=test-project-id'));
    });

    test('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Database error'));

      await expect(qualificationWorkScheduleService.getWorkSchedule('test-object-id'))
        .rejects.toThrow('Ошибка загрузки расписания: Database error');
    });
  });

  describe('saveWorkSchedule', () => {
    test('saves work schedule successfully', async () => {
      const stages = [
        {
          stageName: 'Test Stage',
          stageDescription: 'Test Description',
          startDate: '2023-01-01',
          endDate: '2023-01-02',
          isCompleted: false
        }
      ];

      const result = await qualificationWorkScheduleService.saveWorkSchedule('test-object-id', stages);

      expect(result).toEqual([]);
      expect(mockApi.post).toHaveBeenCalledWith('/qualification-work-schedule', expect.any(Object));
    });
  });

  describe('deleteWorkSchedule', () => {
    test('deletes work schedule by saving empty array', async () => {
      await qualificationWorkScheduleService.deleteWorkSchedule('test-object-id');

      expect(mockApi.get).toHaveBeenCalled();
      expect(mockApi.post).toHaveBeenCalledWith('/qualification-work-schedule', expect.objectContaining({ stages: [] }));
    });

    test('handles API error', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Delete error'));

      await expect(qualificationWorkScheduleService.deleteWorkSchedule('test-object-id'))
        .rejects.toThrow('Ошибка удаления расписания: Delete error');
    });
  });

  describe('createWorkStage', () => {
    test('creates work stage successfully', async () => {
      const stageData = {
        stageName: 'Test Stage',
        stageDescription: 'Test Description',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        isCompleted: false
      };

      mockApi.post.mockResolvedValueOnce({
        id: 'test-id',
        qualification_object_id: 'test-object-id',
        stage_name: 'Test Stage',
        stage_description: 'Test Description',
        start_date: '2023-01-01',
        end_date: '2023-01-02',
        is_completed: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await qualificationWorkScheduleService.createWorkStage('test-object-id', stageData);

      expect(result.id).toBe('test-id');
      expect(result.stageName).toBe('Test Stage');
      expect(mockApi.post).toHaveBeenCalled();
    });
  });

  describe('updateWorkStage', () => {
    test('updates work stage successfully', async () => {
      const stageData = {
        stageName: 'Updated Stage',
        stageDescription: 'Updated Description',
        isCompleted: true
      };

      mockApi.put.mockResolvedValueOnce({
        id: 'test-id',
        qualification_object_id: 'test-object-id',
        stage_name: 'Updated Stage',
        stage_description: 'Updated Description',
        is_completed: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await qualificationWorkScheduleService.updateWorkStage('test-object-id', 'test-stage-id', stageData);

      expect(result.stageName).toBe('Updated Stage');
      expect(mockApi.put).toHaveBeenCalled();
    });
  });

  describe('createAllStages', () => {
    test('creates all stages when none exist', async () => {
      const result = await qualificationWorkScheduleService.createAllStages('test-object-id', 'test-project-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalled();
      expect(mockApi.post).toHaveBeenCalled();
    });

    test('handles API error during creation', async () => {
      mockApi.get.mockResolvedValueOnce([]);
      mockApi.post.mockRejectedValueOnce(new Error('Insert error'));

      await expect(qualificationWorkScheduleService.createAllStages('test-object-id'))
        .rejects.toThrow('Ошибка создания этапов: Insert error');
    });
  });
});
