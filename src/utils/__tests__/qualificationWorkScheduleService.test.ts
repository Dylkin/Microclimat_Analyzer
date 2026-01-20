import { qualificationWorkScheduleService, QualificationWorkStage } from '../qualificationWorkScheduleService';
import { apiClient } from '../apiClient';
import { qualificationObjectService } from '../qualificationObjectService';

jest.mock('../apiClient');
jest.mock('../qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjectById: jest.fn(),
    updateMeasurementZones: jest.fn()
  }
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('QualificationWorkScheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when apiClient is available', () => {
      expect(qualificationWorkScheduleService.isAvailable()).toBe(true);
    });
  });

  describe('getWorkSchedule', () => {
    test('returns mapped stages', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue([
        {
          id: 'stage-1',
          qualification_object_id: 'test-object-id',
          project_id: 'test-project-id',
          stage_name: 'Test Stage',
          stage_description: 'Test Description',
          is_completed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]);

      const result = await qualificationWorkScheduleService.getWorkSchedule('test-object-id', 'test-project-id');
      
      expect(result).toHaveLength(1);
      expect(result[0].stageName).toBe('Test Stage');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/qualification-work-schedule?qualification_object_id=test-object-id&project_id=test-project-id'
      );
    });

    test('handles api error', async () => {
      mockApiClient.get = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(qualificationWorkScheduleService.getWorkSchedule('test-object-id'))
        .rejects.toThrow('Ошибка загрузки расписания: Network error');
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

      mockApiClient.post = jest.fn().mockResolvedValue([
        {
          id: 'stage-1',
          qualification_object_id: 'test-object-id',
          stage_name: 'Test Stage',
          stage_description: 'Test Description',
          is_completed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]);

      const result = await qualificationWorkScheduleService.saveWorkSchedule('test-object-id', stages);
      
      expect(result).toHaveLength(1);
      expect(result[0].stageName).toBe('Test Stage');
      expect(mockApiClient.post).toHaveBeenCalledWith('/qualification-work-schedule', expect.any(Object));
    });

    test('handles api error', async () => {
      mockApiClient.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(qualificationWorkScheduleService.saveWorkSchedule('test-object-id', []))
        .rejects.toThrow('Ошибка сохранения расписания: Network error');
    });
  });

  describe('deleteWorkSchedule', () => {
    test('deletes work schedule successfully', async () => {
      jest.spyOn(qualificationWorkScheduleService, 'getWorkSchedule').mockResolvedValue([]);
      jest.spyOn(qualificationWorkScheduleService, 'saveWorkSchedule').mockResolvedValue([]);

      await qualificationWorkScheduleService.deleteWorkSchedule('test-object-id');
      
      expect(qualificationWorkScheduleService.getWorkSchedule).toHaveBeenCalledWith('test-object-id');
      expect(qualificationWorkScheduleService.saveWorkSchedule).toHaveBeenCalledWith('test-object-id', []);
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

      jest.spyOn(qualificationWorkScheduleService, 'getWorkSchedule').mockResolvedValue([]);
      jest.spyOn(qualificationWorkScheduleService, 'saveWorkSchedule').mockResolvedValue([
        {
          id: '',
          qualificationObjectId: 'test-object-id',
          projectId: undefined,
          stageName: 'Test Stage',
          stageDescription: 'Test Description',
          startDate: '2023-01-01',
          endDate: '2023-01-02',
          isCompleted: false,
          completedAt: undefined,
          completedBy: undefined,
          cancelledAt: undefined,
          cancelledBy: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const result = await qualificationWorkScheduleService.createWorkStage('test-object-id', stageData);
      
      expect(result.stageName).toBe('Test Stage');
    });
  });

  describe('updateWorkStage', () => {
    test('updates work stage successfully', async () => {
      const stageData = {
        stageName: 'Updated Stage',
        stageDescription: 'Updated Description',
        isCompleted: true
      };

      jest.spyOn(qualificationWorkScheduleService, 'getWorkSchedule').mockResolvedValue([
        {
          id: 'stage-1',
          qualificationObjectId: 'test-object-id',
          projectId: undefined,
          stageName: 'Updated Stage',
          stageDescription: 'Old Description',
          startDate: undefined,
          endDate: undefined,
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as QualificationWorkStage[]);
      jest.spyOn(qualificationWorkScheduleService, 'saveWorkSchedule').mockResolvedValue([
        {
          id: 'stage-1',
          qualificationObjectId: 'test-object-id',
          projectId: undefined,
          stageName: 'Updated Stage',
          stageDescription: 'Updated Description',
          startDate: undefined,
          endDate: undefined,
          isCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as QualificationWorkStage[]);

      const result = await qualificationWorkScheduleService.updateWorkStage('test-object-id', 'stage-1', stageData);
      
      expect(result.stageDescription).toBe('Updated Description');
      expect(result.isCompleted).toBe(true);
    });
  });

  describe('createAllStages', () => {
    test('creates all stages when none exist', async () => {
      jest.spyOn(qualificationWorkScheduleService, 'getWorkSchedule').mockResolvedValue([]);
      jest.spyOn(qualificationWorkScheduleService, 'saveWorkSchedule').mockResolvedValue([
        {
          id: 'stage-1',
          qualificationObjectId: 'test-object-id',
          projectId: 'test-project-id',
          stageName: 'Расстановка логгеров',
          stageDescription: 'Установка и настройка логгеров для мониторинга температуры',
          startDate: undefined,
          endDate: undefined,
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as QualificationWorkStage[]);
      jest.spyOn(qualificationWorkScheduleService as any, 'createExternalSensorZone').mockResolvedValue(undefined);

      const result = await qualificationWorkScheduleService.createAllStages('test-object-id', 'test-project-id');
      
      expect(result.length).toBeGreaterThan(0);
      expect(qualificationWorkScheduleService.saveWorkSchedule).toHaveBeenCalled();
    });

    test('creates all stages without projectId', async () => {
      jest.spyOn(qualificationWorkScheduleService, 'getWorkSchedule').mockResolvedValue([]);
      jest.spyOn(qualificationWorkScheduleService, 'saveWorkSchedule').mockResolvedValue([] as QualificationWorkStage[]);
      jest.spyOn(qualificationWorkScheduleService as any, 'createExternalSensorZone').mockResolvedValue(undefined);

      const result = await qualificationWorkScheduleService.createAllStages('test-object-id');
      
      expect(result).toEqual([]);
    });
  });
});



















