import { qualificationWorkScheduleService, QualificationWorkStage } from '../qualificationWorkScheduleService';

// Mock для Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ 
          data: [], 
          error: null 
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ 
        data: [], 
        error: null 
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-id' }, 
            error: null 
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ 
        data: null, 
        error: null 
      }))
    }))
  }))
};

// Mock для createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('QualificationWorkScheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when supabase is available', () => {
      expect(qualificationWorkScheduleService.isAvailable()).toBe(true);
    });
  });

  describe('getWorkSchedule', () => {
    test('returns empty array when no stages exist', async () => {
      const result = await qualificationWorkScheduleService.getWorkSchedule('test-object-id');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('filters by projectId when provided', async () => {
      const result = await qualificationWorkScheduleService.getWorkSchedule('test-object-id', 'test-project-id');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.getWorkSchedule('test-object-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      });

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
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.saveWorkSchedule('test-object-id', []))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('deleteWorkSchedule', () => {
    test('deletes work schedule successfully', async () => {
      await qualificationWorkScheduleService.deleteWorkSchedule('test-object-id');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.deleteWorkSchedule('test-object-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: new Error('Delete error') 
          }))
        }))
      });

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

      const result = await qualificationWorkScheduleService.createWorkStage('test-object-id', stageData);
      
      expect(result).toEqual({
        id: 'test-id',
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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.createWorkStage('test-object-id', {
        stageName: 'Test',
        stageDescription: 'Test',
        isCompleted: false
      }))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('updateWorkStage', () => {
    test('updates work stage successfully', async () => {
      const stageData = {
        stageName: 'Updated Stage',
        stageDescription: 'Updated Description',
        isCompleted: true
      };

      const result = await qualificationWorkScheduleService.updateWorkStage('test-object-id', 'test-stage-id', stageData);
      
      expect(result).toEqual({
        id: 'test-id',
        qualificationObjectId: 'test-object-id',
        projectId: undefined,
        stageName: 'Updated Stage',
        stageDescription: 'Updated Description',
        startDate: undefined,
        endDate: undefined,
        isCompleted: true,
        completedAt: undefined,
        completedBy: undefined,
        cancelledAt: undefined,
        cancelledBy: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.updateWorkStage('test-object-id', 'test-stage-id', {
        stageName: 'Test',
        stageDescription: 'Test',
        isCompleted: false
      }))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('createAllStages', () => {
    test('creates all stages when none exist', async () => {
      const result = await qualificationWorkScheduleService.createAllStages('test-object-id', 'test-project-id');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('creates all stages without projectId', async () => {
      const result = await qualificationWorkScheduleService.createAllStages('test-object-id');
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_work_schedule');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationWorkScheduleService.supabase = null;

      await expect(qualificationWorkScheduleService.createAllStages('test-object-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error during creation', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: [], 
              error: null 
            }))
          }))
        }))
      }).mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: new Error('Insert error') 
          }))
        }))
      });

      await expect(qualificationWorkScheduleService.createAllStages('test-object-id'))
        .rejects.toThrow('Ошибка создания этапов: Insert error');
    });
  });
});



















