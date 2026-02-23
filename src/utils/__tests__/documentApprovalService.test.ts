import { DocumentApprovalService } from '../documentApprovalService';
import { apiClient } from '../apiClient';

jest.mock('../apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('DocumentApprovalService', () => {
  let service: DocumentApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentApprovalService();
    mockApi.get.mockResolvedValue([]);
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/users/')) {
        return Promise.resolve({ full_name: 'Test User', email: 'test@example.com' });
      }
      if (url.includes('comments/')) {
        return Promise.resolve([]);
      }
      if (url.includes('approvals/')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    mockApi.post.mockResolvedValue({
      id: 'test-id',
      document_id: 'test-doc-id',
      user_id: 'test-user-id',
      user_name: 'Test User',
      status: 'approved',
      comment: 'Test comment',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    });
  });

  describe('getComments', () => {
    test('returns empty array for comments', async () => {
      const result = await service.getComments('test-doc-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith('/document-approval/comments/test-doc-id');
    });
  });

  describe('getApprovalHistory', () => {
    test('returns empty array for approval history', async () => {
      const result = await service.getApprovalHistory('test-doc-id');

      expect(result).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('test-doc-id'));
    });
  });

  describe('addComment', () => {
    test('adds comment successfully', async () => {
      mockApi.post.mockResolvedValueOnce({
        id: 'test-id',
        document_id: 'test-doc-id',
        user_id: 'test-user-id',
        user_name: 'Test User',
        comment: 'Test comment',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await service.addComment('test-doc-id', 'Test comment', 'test-user-id');

      expect(result.documentId).toBe('test-doc-id');
      expect(result.comment).toBe('Test comment');
      expect(mockApi.post).toHaveBeenCalledWith('/document-approval/comments', expect.any(Object));
    });

    test('handles API error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('User not found'));
      mockApi.post.mockRejectedValueOnce(new Error('Ошибка сохранения комментария'));

      await expect(service.addComment('test-doc-id', 'Test comment', 'test-user-id'))
        .rejects.toThrow();
    });
  });

  describe('approveDocument', () => {
    test('approves document successfully', async () => {
      const result = await service.approveDocument('test-doc-id', 'test-user-id', 'Approval comment');

      expect(result.documentId).toBe('test-doc-id');
      expect(mockApi.post).toHaveBeenCalledWith('/document-approval/approve', expect.any(Object));
    });
  });

  describe('rejectDocument', () => {
    test('rejects document successfully', async () => {
      mockApi.post.mockResolvedValueOnce({
        id: 'test-id',
        document_id: 'test-doc-id',
        user_id: 'test-user-id',
        user_name: 'Test User',
        status: 'rejected',
        comment: 'Rejection comment',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      });

      const result = await service.rejectDocument('test-doc-id', 'test-user-id', 'Rejection comment');

      expect(result.status).toBe('rejected');
      expect(mockApi.post).toHaveBeenCalledWith('/document-approval/reject', expect.any(Object));
    });
  });

  describe('getApprovalStatus', () => {
    test('returns approval status', async () => {
      mockApi.get.mockResolvedValueOnce({
        documentId: 'test-doc-id',
        status: 'pending',
        comments: [],
        approvalHistory: []
      });

      const result = await service.getApprovalStatus('test-doc-id');

      expect(result.documentId).toBe('test-doc-id');
      expect(result.status).toBe('pending');
    });
  });
});
