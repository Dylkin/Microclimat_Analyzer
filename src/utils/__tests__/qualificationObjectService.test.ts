import { qualificationObjectService } from '../qualificationObjectService';

// Mock для Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: {
            id: 'test-id',
            contractor_id: 'test-contractor-id',
            type: 'автомобиль',
            name: 'Test Object',
            manufacturer: 'Test Manufacturer',
            climate_system: 'Test Climate System',
            address: 'Test Address',
            latitude: 55.7558,
            longitude: 37.6176,
            area: 100,
            vin: 'TEST123456789',
            registration_number: 'A123BC',
            body_volume: 10.5,
            inventory_number: 'INV123',
            chamber_volume: 5.0,
            serial_number: 'SN123456',
            measurement_zones: '[]',
            plan_file_url: null,
            plan_file_name: null,
            geocoded_at: null,
            test_data_file_url: null,
            test_data_file_name: null,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }, 
          error: null 
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: {
            id: 'test-id',
            contractor_id: 'test-contractor-id',
            type: 'автомобиль',
            name: 'Test Object',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }, 
          error: null 
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: {
              id: 'test-id',
              contractor_id: 'test-contractor-id',
              type: 'автомобиль',
              name: 'Updated Object',
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            }, 
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
  })),
  storage: {
    from: jest.fn(() => ({
      list: jest.fn(() => Promise.resolve({ 
        data: [], 
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

describe('QualificationObjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when supabase is available', () => {
      expect(qualificationObjectService.isAvailable()).toBe(true);
    });
  });

  describe('getQualificationObjectById', () => {
    test('returns qualification object by id', async () => {
      const result = await qualificationObjectService.getQualificationObjectById('test-id');
      
      expect(result).toEqual({
        id: 'test-id',
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Test Object',
        manufacturer: 'Test Manufacturer',
        climateSystem: 'Test Climate System',
        address: 'Test Address',
        latitude: 55.7558,
        longitude: 37.6176,
        area: 100,
        vin: 'TEST123456789',
        registrationNumber: 'A123BC',
        bodyVolume: 10.5,
        inventoryNumber: 'INV123',
        chamberVolume: 5.0,
        serialNumber: 'SN123456',
        measurementZones: [],
        planFileUrl: null,
        planFileName: null,
        geocodedAt: null,
        testDataFileUrl: null,
        testDataFileName: null,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationObjectService.supabase = null;

      await expect(qualificationObjectService.getQualificationObjectById('test-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      });

      await expect(qualificationObjectService.getQualificationObjectById('test-id'))
        .rejects.toThrow('Ошибка загрузки объекта квалификации: Database error');
    });
  });

  describe('createQualificationObject', () => {
    test('creates qualification object successfully', async () => {
      const objectData = {
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Test Object',
        manufacturer: 'Test Manufacturer',
        climateSystem: 'Test Climate System',
        address: 'Test Address',
        latitude: 55.7558,
        longitude: 37.6176,
        area: 100,
        vin: 'TEST123456789',
        registrationNumber: 'A123BC',
        bodyVolume: 10.5,
        inventoryNumber: 'INV123',
        chamberVolume: 5.0,
        serialNumber: 'SN123456',
        measurementZones: []
      };

      const result = await qualificationObjectService.createQualificationObject(objectData);
      
      expect(result).toEqual({
        id: 'test-id',
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Test Object',
        manufacturer: undefined,
        climateSystem: undefined,
        address: undefined,
        latitude: undefined,
        longitude: undefined,
        area: undefined,
        vin: undefined,
        registrationNumber: undefined,
        bodyVolume: undefined,
        inventoryNumber: undefined,
        chamberVolume: undefined,
        serialNumber: undefined,
        measurementZones: undefined,
        planFileUrl: undefined,
        planFileName: undefined,
        geocodedAt: undefined,
        testDataFileUrl: undefined,
        testDataFileName: undefined,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationObjectService.supabase = null;

      await expect(qualificationObjectService.createQualificationObject({
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Test Object'
      }))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('updateQualificationObject', () => {
    test('updates qualification object successfully', async () => {
      const updates = {
        name: 'Updated Object',
        manufacturer: 'Updated Manufacturer'
      };

      const result = await qualificationObjectService.updateQualificationObject('test-id', updates);
      
      expect(result).toEqual({
        id: 'test-id',
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Updated Object',
        manufacturer: undefined,
        climateSystem: undefined,
        address: undefined,
        latitude: undefined,
        longitude: undefined,
        area: undefined,
        vin: undefined,
        registrationNumber: undefined,
        bodyVolume: undefined,
        inventoryNumber: undefined,
        chamberVolume: undefined,
        serialNumber: undefined,
        measurementZones: undefined,
        planFileUrl: undefined,
        planFileName: undefined,
        geocodedAt: undefined,
        testDataFileUrl: undefined,
        testDataFileName: undefined,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationObjectService.supabase = null;

      await expect(qualificationObjectService.updateQualificationObject('test-id', {}))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('deleteQualificationObject', () => {
    test('deletes qualification object successfully', async () => {
      await qualificationObjectService.deleteQualificationObject('test-id');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('qualification_objects');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationObjectService.supabase = null;

      await expect(qualificationObjectService.deleteQualificationObject('test-id'))
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

      await expect(qualificationObjectService.deleteQualificationObject('test-id'))
        .rejects.toThrow('Ошибка удаления объекта квалификации: Delete error');
    });
  });

  describe('getLoggerRemovalFiles', () => {
    test('returns logger removal files', async () => {
      const result = await qualificationObjectService.getLoggerRemovalFiles('test-object-id');
      
      expect(result).toEqual({});
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('logger-removal-files');
    });

    test('handles service not configured', async () => {
      // @ts-ignore
      qualificationObjectService.supabase = null;

      await expect(qualificationObjectService.getLoggerRemovalFiles('test-object-id'))
        .rejects.toThrow('Supabase не настроен');
    });

    test('handles storage error', async () => {
      mockSupabase.storage.from.mockReturnValueOnce({
        list: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: new Error('Storage error') 
        }))
      });

      const result = await qualificationObjectService.getLoggerRemovalFiles('test-object-id');
      expect(result).toEqual({});
    });
  });
});



















