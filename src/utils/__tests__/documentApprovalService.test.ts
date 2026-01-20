import { DocumentApprovalService } from '../documentApprovalService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('DocumentApprovalService', () => {
  let service: DocumentApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentApprovalService();
  });

  describe('getComments', () => {
    test('returns mapped comments', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue([
        {
          id: 'comment-1',
          document_id: 'doc-1',
          user_id: 'user-1',
          user_name: 'Test User',
          comment: 'Hello',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]);

      const result = await service.getComments('doc-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].comment).toBe('Hello');
      expect(mockApiClient.get).toHaveBeenCalledWith('/document-approval/comments/doc-1');
    });

    test('returns empty array on error', async () => {
      mockApiClient.get = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.getComments('doc-1');
      expect(result).toEqual([]);
    });
  });

  describe('addComment', () => {
    test('adds comment with resolved user name', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({ fullName: 'Test User' });
      mockApiClient.post = jest.fn().mockResolvedValue({
        id: 'comment-1',
        document_id: 'doc-1',
        user_id: 'user-1',
        user_name: 'Test User',
        comment: 'Hello',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const result = await service.addComment('doc-1', 'Hello', 'user-1');
      
      expect(result.userName).toBe('Test User');
      expect(result.comment).toBe('Hello');
      expect(mockApiClient.post).toHaveBeenCalledWith('/document-approval/comments', expect.any(Object));
    });

    test('handles api error', async () => {
      mockApiClient.get = jest.fn().mockRejectedValue(new Error('User error'));
      mockApiClient.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.addComment('doc-1', 'Hello', 'user-1'))
        .rejects.toThrow('Ошибка сохранения комментария: Network error');
    });
  });

  describe('approveDocument', () => {
    test('approves document successfully', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({ fullName: 'Test User' });
      mockApiClient.post = jest.fn().mockResolvedValue({
        id: 'approval-1',
        document_id: 'doc-1',
        user_id: 'user-1',
        user_name: 'Test User',
        status: 'approved',
        comment: 'Ok',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const result = await service.approveDocument('doc-1', 'user-1', 'Ok');
      
      expect(result.status).toBe('approved');
      expect(result.comment).toBe('Ok');
    });
  });

  describe('rejectDocument', () => {
    test('rejects document successfully', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({ fullName: 'Test User' });
      mockApiClient.post = jest.fn().mockResolvedValue({
        id: 'approval-1',
        document_id: 'doc-1',
        user_id: 'user-1',
        user_name: 'Test User',
        status: 'rejected',
        comment: 'No',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const result = await service.rejectDocument('doc-1', 'user-1', 'No');
      
      expect(result.status).toBe('rejected');
      expect(result.comment).toBe('No');
    });

    test('requires comment', async () => {
      await expect(service.rejectDocument('doc-1', 'user-1'))
        .rejects.toThrow('Комментарий обязателен при отклонении документа');
    });
  });

  describe('cancelApproval', () => {
    test('cancels approval successfully', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue({ fullName: 'Test User' });
      mockApiClient.post = jest.fn().mockResolvedValue({
        id: 'approval-1',
        document_id: 'doc-1',
        user_id: 'user-1',
        user_name: 'Test User',
        status: 'pending',
        comment: 'Согласование отменено',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const result = await service.cancelApproval('doc-1', 'user-1');
      
      expect(result.status).toBe('pending');
    });
  });

  describe('getApprovalHistory', () => {
    test('returns mapped history', async () => {
      mockApiClient.get = jest.fn().mockResolvedValue([
        {
          id: 'approval-1',
          document_id: 'doc-1',
          user_id: 'user-1',
          user_name: 'Test User',
          status: 'approved',
          comment: 'Ok',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]);

      const result = await service.getApprovalHistory('doc-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('approved');
    });
  });

  describe('getApprovalStatus', () => {
    test('aggregates status', async () => {
      jest.spyOn(service, 'getComments').mockResolvedValue([]);
      jest.spyOn(service, 'getApprovalHistory').mockResolvedValue([]);

      const result = await service.getApprovalStatus('doc-1');
      
      expect(result.status).toBe('pending');
      expect(result.documentId).toBe('doc-1');
    });
  });
});
