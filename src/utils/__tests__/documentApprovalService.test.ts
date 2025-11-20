import { DocumentApprovalService } from '../documentApprovalService';

// Mock для Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(() => Promise.resolve({ 
      data: { user: { id: 'test-user', email: 'test@example.com' } }, 
      error: null 
    }))
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ 
          data: { id: 'test-id' }, 
          error: null 
        }))
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ 
          data: [], 
          error: null 
        }))
      }))
    }))
  }))
};

// Mock для createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

describe('DocumentApprovalService', () => {
  let service: DocumentApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentApprovalService();
  });

  describe('getComments', () => {
    test('returns empty array for comments', async () => {
      const result = await service.getComments('test-doc-id');
      
      expect(result).toEqual([]);
    });

    test('handles service not configured', async () => {
      // Создаем сервис без Supabase
      const serviceWithoutSupabase = new DocumentApprovalService();
      // @ts-ignore
      serviceWithoutSupabase.supabase = null;

      await expect(serviceWithoutSupabase.getComments('test-doc-id'))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('getApprovalHistory', () => {
    test('returns empty array for approval history', async () => {
      const result = await service.getApprovalHistory('test-doc-id');
      
      expect(result).toEqual([]);
    });

    test('handles service not configured', async () => {
      // Создаем сервис без Supabase
      const serviceWithoutSupabase = new DocumentApprovalService();
      // @ts-ignore
      serviceWithoutSupabase.supabase = null;

      await expect(serviceWithoutSupabase.getApprovalHistory('test-doc-id'))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('addComment', () => {
    test('adds comment successfully', async () => {
      const result = await service.addComment('test-doc-id', 'Test comment', 'test-user-id');
      
      expect(result).toEqual({
        id: expect.any(String),
        documentId: 'test-doc-id',
        userId: 'test-user',
        userName: 'test@example.com',
        comment: 'Test comment',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('handles authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: new Error('Auth error') 
      });

      await expect(service.addComment('test-doc-id', 'Test comment', 'test-user-id'))
        .rejects.toThrow('Требуется аутентификация для добавления комментариев');
    });

    test('handles service not configured', async () => {
      const serviceWithoutSupabase = new DocumentApprovalService();
      // @ts-ignore
      serviceWithoutSupabase.supabase = null;

      await expect(serviceWithoutSupabase.addComment('test-doc-id', 'Test comment', 'test-user-id'))
        .rejects.toThrow('Supabase не настроен');
    });
  });

  describe('approveDocument', () => {
    test('approves document successfully', async () => {
      const result = await service.approveDocument('test-doc-id', 'test-user-id', 'Approval comment');
      
      expect(result).toEqual({
        id: expect.any(String),
        documentId: 'test-doc-id',
        userId: 'test-user',
        userName: 'test@example.com',
        status: 'approved',
        comment: 'Approval comment',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('approves document without comment', async () => {
      const result = await service.approveDocument('test-doc-id', 'test-user-id');
      
      expect(result.comment).toBeUndefined();
    });

    test('handles authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: new Error('Auth error') 
      });

      await expect(service.approveDocument('test-doc-id', 'test-user-id'))
        .rejects.toThrow('Требуется аутентификация для согласования документов');
    });
  });

  describe('rejectDocument', () => {
    test('rejects document successfully', async () => {
      const result = await service.rejectDocument('test-doc-id', 'test-user-id', 'Rejection comment');
      
      expect(result).toEqual({
        id: expect.any(String),
        documentId: 'test-doc-id',
        userId: 'test-user',
        userName: 'test@example.com',
        status: 'rejected',
        comment: 'Rejection comment',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('rejects document without comment', async () => {
      const result = await service.rejectDocument('test-doc-id', 'test-user-id');
      
      expect(result.comment).toBeUndefined();
    });

    test('handles authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null }, 
        error: new Error('Auth error') 
      });

      await expect(service.rejectDocument('test-doc-id', 'test-user-id'))
        .rejects.toThrow('Требуется аутентификация для отклонения документов');
    });
  });

  describe('getApprovalStatus', () => {
    test('returns approval status with empty data', async () => {
      const result = await service.getApprovalStatus('test-doc-id');
      
      expect(result).toEqual({
        documentId: 'test-doc-id',
        status: 'pending',
        lastApproval: undefined,
        comments: [],
        approvalHistory: []
      });
    });

    test('handles service not configured', async () => {
      const serviceWithoutSupabase = new DocumentApprovalService();
      // @ts-ignore
      serviceWithoutSupabase.supabase = null;

      await expect(serviceWithoutSupabase.getApprovalStatus('test-doc-id'))
        .rejects.toThrow('Supabase не настроен');
    });
  });
});























