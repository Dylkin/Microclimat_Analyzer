import { equipmentService, Equipment, EquipmentVerification } from '../equipmentService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('EquipmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('returns true when apiClient is available', () => {
      expect(equipmentService.isAvailable()).toBe(true);
    });
  });

  describe('getAllEquipment', () => {
    test('fetches all equipment with pagination', async () => {
      const mockEquipment = [
        {
          id: 'eq-1',
          type: 'Testo 174T',
          name: 'DL-001',
          serialNumber: 'DL-001',
          serial_number: 'DL-001',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          verifications: []
        }
      ];

      mockApiClient.get = jest.fn().mockResolvedValue({
        equipment: mockEquipment,
        total: 1,
        totalPages: 1
      });

      const result = await equipmentService.getAllEquipment(1, 10);

      expect(result.equipment).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/equipment?page=1&limit=10&sortOrder=asc');
    });

    test('handles search term', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({
        equipment: [],
        total: 0,
        totalPages: 0
      });

      await equipmentService.getAllEquipment(1, 10, 'DL-001');

      expect(mockApiClient.get).toHaveBeenCalledWith('/equipment?page=1&limit=10&sortOrder=asc&search=DL-001');
    });
  });

  describe('getEquipmentById', () => {
    test('fetches equipment by id', async () => {
      const mockEquipment = {
        id: 'eq-1',
        type: 'Testo 174T',
        name: 'DL-001',
        serialNumber: 'DL-001',
        serial_number: 'DL-001',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        verifications: [
          {
            id: 'ver-1',
            equipment_id: 'eq-1',
            verification_start_date: '2025-01-01',
            verification_end_date: '2025-12-31',
            verification_file_url: 'http://example.com/file.png',
            verification_file_name: 'file.png',
            created_at: '2025-01-01T00:00:00Z'
          }
        ]
      };

      mockApiClient.get = jest.fn().mockResolvedValue(mockEquipment);

      const result = await equipmentService.getEquipmentById('eq-1');

      expect(result.id).toBe('eq-1');
      expect(result.name).toBe('DL-001');
      expect(result.verifications).toHaveLength(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/eq-1');
    });
  });

  describe('addVerification', () => {
    test('adds verification to equipment', async () => {
      const mockVerification = {
        id: 'ver-1',
        equipmentId: 'eq-1',
        verificationStartDate: new Date('2025-01-01'),
        verificationEndDate: new Date('2025-12-31'),
        verificationFileUrl: 'http://example.com/file.png',
        verificationFileName: 'file.png',
        createdAt: new Date('2025-01-01')
      };

      mockApiClient.post = jest.fn().mockResolvedValue(mockVerification);

      const result = await equipmentService.addVerification('eq-1', {
        verificationStartDate: new Date('2025-01-01'),
        verificationEndDate: new Date('2025-12-31'),
        verificationFileUrl: 'http://example.com/file.png',
        verificationFileName: 'file.png'
      });

      expect(result.id).toBe('ver-1');
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/equipment/eq-1/verifications',
        expect.objectContaining({
          verificationStartDate: expect.any(Date),
          verificationEndDate: expect.any(Date)
        })
      );
    });
  });
});

