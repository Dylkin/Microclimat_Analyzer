import { qualificationObjectService } from '../qualificationObjectService';
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

const apiObject = {
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
};

describe('QualificationObjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue(apiObject);
    mockApi.post.mockResolvedValue({ ...apiObject, name: 'Test Object' });
    mockApi.put.mockResolvedValue({ ...apiObject, name: 'Updated Object' });
    mockApi.delete.mockResolvedValue(undefined);
  });

  describe('isAvailable', () => {
    test('returns true when API is available', () => {
      expect(qualificationObjectService.isAvailable()).toBe(true);
    });
  });

  describe('getQualificationObjectById', () => {
    test('returns qualification object by id', async () => {
      const result = await qualificationObjectService.getQualificationObjectById('test-id');

      expect(result.id).toBe('test-id');
      expect(result.contractorId).toBe('test-contractor-id');
      expect(result.type).toBe('автомобиль');
      expect(result.name).toBe('Test Object');
      expect(result.manufacturer).toBe('Test Manufacturer');
      expect(result.latitude).toBe(55.7558);
      expect(result.longitude).toBe(37.6176);
      expect(result.area).toBe(100);
      expect(result.createdAt).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(mockApi.get).toHaveBeenCalledWith('/qualification-objects/test-id');
    });

    test('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Database error'));

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
        measurementZones: [] as string[]
      };

      const result = await qualificationObjectService.createQualificationObject(objectData);

      expect(result.name).toBe('Test Object');
      expect(mockApi.post).toHaveBeenCalledWith('/qualification-objects', expect.any(Object));
    });
  });

  describe('updateQualificationObject', () => {
    test('updates qualification object successfully', async () => {
      const updates = {
        name: 'Updated Object',
        manufacturer: 'Updated Manufacturer'
      };

      const result = await qualificationObjectService.updateQualificationObject('test-id', updates);

      expect(result.name).toBe('Updated Object');
      expect(mockApi.put).toHaveBeenCalledWith('/qualification-objects/test-id', expect.any(Object));
    });
  });

  describe('deleteQualificationObject', () => {
    test('deletes qualification object successfully', async () => {
      await qualificationObjectService.deleteQualificationObject('test-id');

      expect(mockApi.delete).toHaveBeenCalledWith('/qualification-objects/test-id');
    });

    test('handles API error', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('Delete error'));

      await expect(qualificationObjectService.deleteQualificationObject('test-id'))
        .rejects.toThrow('Ошибка удаления объекта квалификации: Delete error');
    });
  });

  describe('getLoggerRemovalFiles', () => {
    test('returns logger removal files from API', async () => {
      mockApi.post.mockResolvedValueOnce({ data: [] });

      const result = await qualificationObjectService.getLoggerRemovalFiles('test-object-id');

      expect(result).toEqual({});
      expect(mockApi.post).toHaveBeenCalledWith('/storage/list', expect.any(Object));
    });
  });
});
