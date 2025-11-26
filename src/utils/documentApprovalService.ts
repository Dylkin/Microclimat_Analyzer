import { apiClient } from './apiClient';
import { DocumentComment, ApprovalRecord, DocumentApprovalStatus } from '../types/DocumentApproval';

export class DocumentApprovalService {

  async addComment(documentId: string, comment: string, userId: string): Promise<DocumentComment> {
    try {
      // Получаем ФИО пользователя из API
      let userName = 'Пользователь';
      try {
        const userData = await apiClient.get<any>(`/users/${userId}`);
        userName = userData.fullName || userData.full_name || userData.email || 'Пользователь';
      } catch (error) {
        console.warn('Не удалось получить ФИО пользователя:', error);
      }

      const data = await apiClient.post<any>('/document-approval/comments', {
        documentId,
        userId,
        userName,
        comment: comment.trim()
      });

      return {
        id: data.id,
        documentId: data.documentId || data.document_id,
        userId: data.userId || data.user_id,
        userName: data.userName || data.user_name,
        comment: data.comment,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка сохранения комментария:', error);
      throw new Error(`Ошибка сохранения комментария: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getComments(documentId: string): Promise<DocumentComment[]> {
    try {
      const data = await apiClient.get<any[]>(`/document-approval/comments/${documentId}`);
      return (data || []).map((comment: any) => ({
        id: comment.id,
        documentId: comment.documentId || comment.document_id,
        userId: comment.userId || comment.user_id,
        userName: comment.userName || comment.user_name,
        comment: comment.comment,
        createdAt: comment.createdAt ? new Date(comment.createdAt) : (comment.created_at ? new Date(comment.created_at) : new Date()),
        updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : (comment.updated_at ? new Date(comment.updated_at) : new Date())
      }));
    } catch (error: any) {
      console.error('Ошибка загрузки комментариев:', error);
      return [];
    }
  }

  async approveDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord> {
    try {
      // Получаем ФИО пользователя из API
      let userName = 'Пользователь';
      try {
        const userData = await apiClient.get<any>(`/users/${userId}`);
        userName = userData.fullName || userData.full_name || userData.email || 'Пользователь';
      } catch (error) {
        console.warn('Не удалось получить ФИО пользователя:', error);
      }

      const data = await apiClient.post<any>('/document-approval/approve', {
        documentId,
        userId,
        userName,
        comment: comment?.trim()
      });

      return {
        id: data.id,
        documentId: data.documentId || data.document_id,
        userId: data.userId || data.user_id,
        userName: data.userName || data.user_name,
        status: data.status,
        comment: data.comment,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка сохранения согласования:', error);
      throw new Error(`Ошибка сохранения согласования: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async rejectDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord> {
    try {
      if (!comment) {
        throw new Error('Комментарий обязателен при отклонении документа');
      }

      // Получаем ФИО пользователя из API
      let userName = 'Пользователь';
      try {
        const userData = await apiClient.get<any>(`/users/${userId}`);
        userName = userData.fullName || userData.full_name || userData.email || 'Пользователь';
      } catch (error) {
        console.warn('Не удалось получить ФИО пользователя:', error);
      }

      const data = await apiClient.post<any>('/document-approval/reject', {
        documentId,
        userId,
        userName,
        comment: comment.trim()
      });

      return {
        id: data.id,
        documentId: data.documentId || data.document_id,
        userId: data.userId || data.user_id,
        userName: data.userName || data.user_name,
        status: data.status,
        comment: data.comment,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка сохранения отклонения:', error);
      throw new Error(`Ошибка сохранения отклонения: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getApprovalStatus(documentId: string): Promise<DocumentApprovalStatus> {
    const [comments, approvals] = await Promise.all([
      this.getComments(documentId),
      this.getApprovalHistory(documentId)
    ]);

    const lastApproval = approvals.length > 0 ? approvals[approvals.length - 1] : undefined;
    const status = lastApproval?.status || 'pending';

    return {
      documentId,
      status,
      lastApproval,
      comments,
      approvalHistory: approvals
    };
  }

  async cancelApproval(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord> {
    try {
      // Получаем ФИО пользователя из API
      let userName = 'Пользователь';
      try {
        const userData = await apiClient.get<any>(`/users/${userId}`);
        userName = userData.fullName || userData.full_name || userData.email || 'Пользователь';
      } catch (error) {
        console.warn('Не удалось получить ФИО пользователя:', error);
      }

      // Отменяем согласование через создание новой записи со статусом pending
      const data = await apiClient.post<any>('/document-approval/approve', {
        documentId,
        userId,
        userName,
        comment: comment?.trim() || 'Согласование отменено',
        status: 'pending'
      });

      return {
        id: data.id,
        documentId: data.documentId || data.document_id,
        userId: data.userId || data.user_id,
        userName: data.userName || data.user_name,
        status: 'pending',
        comment: data.comment,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка сохранения отмены согласования:', error);
      throw new Error(`Ошибка сохранения отмены согласования: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async getApprovalHistory(documentId: string): Promise<ApprovalRecord[]> {
    try {
      const data = await apiClient.get<any[]>(`/document-approval/approvals/${documentId}`);
      return (data || []).map((approval: any) => ({
        id: approval.id,
        documentId: approval.documentId || approval.document_id,
        userId: approval.userId || approval.user_id,
        userName: approval.userName || approval.user_name,
        status: approval.status,
        comment: approval.comment,
        createdAt: approval.createdAt ? new Date(approval.createdAt) : (approval.created_at ? new Date(approval.created_at) : new Date()),
        updatedAt: approval.updatedAt ? new Date(approval.updatedAt) : (approval.updated_at ? new Date(approval.updated_at) : new Date())
      }));
    } catch (error: any) {
      console.error('Ошибка загрузки истории согласований:', error);
      return [];
    }
  }
}

export const documentApprovalService = new DocumentApprovalService();

