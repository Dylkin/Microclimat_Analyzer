import { qualificationObjectService } from '../qualificationObjectService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('QualificationObjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when apiClient is available', () => {
      expect(qualificationObjectService.isAvailable()).toBe(true);
    });
  });

  describe('getQualificationObjectById', () => {
    test('returns qualification object by id', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({
        id: 'test-id',
        contractor_id: 'test-contractor-id',
        objectType: 'vehicle',
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
        measurement_zones: [],
        zones: [],
        plan_file_url: null,
        plan_file_name: null,
        geocoded_at: null,
        test_data_file_url: null,
        test_data_file_name: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

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
        zones: [],
        planFileUrl: '',
        planFileName: '',
        geocodedAt: undefined,
        testDataFileUrl: '',
        testDataFileName: '',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      });
      expect(mockApiClient.get).toHaveBeenCalledWith('/qualification-objects/test-id');
    });

    test('handles api error', async () => {
      mockApiClient.get = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(qualificationObjectService.getQualificationObjectById('test-id'))
        .rejects.toThrow('Ошибка загрузки объекта квалификации: Network error');
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
        measurementZones: [],
        zones: []
      };

      mockApiClient.post = jest.fn().mockResolvedValue({
        id: 'test-id',
        contractor_id: 'test-contractor-id',
        objectType: 'vehicle',
        name: 'Test Object',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await qualificationObjectService.createQualificationObject(objectData);
      
      expect(result.id).toBe('test-id');
      expect(result.contractorId).toBe('test-contractor-id');
      expect(result.type).toBe('автомобиль');
      expect(mockApiClient.post).toHaveBeenCalledWith('/qualification-objects', expect.any(Object));
    });

    test('handles api error', async () => {
      mockApiClient.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(qualificationObjectService.createQualificationObject({
        contractorId: 'test-contractor-id',
        type: 'автомобиль',
        name: 'Test Object'
      }))
        .rejects.toThrow('Ошибка создания объекта квалификации: Network error');
    });
  });

  describe('updateQualificationObject', () => {
    test('updates qualification object successfully', async () => {
      const updates = {
        name: 'Updated Object',
        manufacturer: 'Updated Manufacturer'
      };

      mockApiClient.put = jest.fn().mockResolvedValue({
        id: 'test-id',
        contractor_id: 'test-contractor-id',
        objectType: 'vehicle',
        name: 'Updated Object',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await qualificationObjectService.updateQualificationObject('test-id', updates);
      
      expect(result.name).toBe('Updated Object');
      expect(mockApiClient.put).toHaveBeenCalledWith('/qualification-objects/test-id', expect.any(Object));
    });

    test('handles api error', async () => {
      mockApiClient.put = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(qualificationObjectService.updateQualificationObject('test-id', {}))
        .rejects.toThrow('Ошибка обновления объекта квалификации: Network error');
    });
  });

  describe('deleteQualificationObject', () => {
    test('deletes qualification object successfully', async () => {
      mockApiClient.delete = jest.fn().mockResolvedValue(undefined);

      await qualificationObjectService.deleteQualificationObject('test-id');
      
      expect(mockApiClient.delete).toHaveBeenCalledWith('/qualification-objects/test-id');
    });

    test('handles api error', async () => {
      mockApiClient.delete = jest.fn().mockRejectedValue(new Error('Delete error'));

      await expect(qualificationObjectService.deleteQualificationObject('test-id'))
        .rejects.toThrow('Ошибка удаления объекта квалификации: Delete error');
    });
  });

  describe('getLoggerRemovalFiles', () => {
    test('returns logger removal files', async () => {
      mockApiClient.post = jest.fn().mockResolvedValue({ data: [] });

      const result = await qualificationObjectService.getLoggerRemovalFiles('test-object-id');
      
      expect(result).toEqual({});
      expect(mockApiClient.post).toHaveBeenCalledWith('/storage/list', expect.objectContaining({
        bucket: 'qualification-objects'
      }));
    });

    test('handles storage error', async () => {
      mockApiClient.post = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await qualificationObjectService.getLoggerRemovalFiles('test-object-id');
      expect(result).toEqual({});
    });
  });
});



















