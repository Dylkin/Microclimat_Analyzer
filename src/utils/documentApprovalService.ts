import { supabase } from './supabaseClient';
import { DocumentComment, ApprovalRecord, DocumentApprovalStatus } from '../types/DocumentApproval';

export class DocumentApprovalService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  async addComment(documentId: string, comment: string, userId: string): Promise<DocumentComment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Требуется аутентификация для добавления комментариев');
    }

    // Получаем ФИО пользователя из таблицы users
    let userName = 'Пользователь';
    try {
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (!userError && userData) {
        userName = userData.full_name;
      } else {
        // Fallback к email если не найдено в таблице users
        userName = user.email || 'Пользователь';
      }
    } catch (error) {
      console.warn('Не удалось получить ФИО пользователя из таблицы users:', error);
      userName = user.email || 'Пользователь';
    }

    const commentData = {
      document_id: documentId,
      user_id: user.id,
      user_name: userName,
      comment: comment.trim()
    };

    const { data, error } = await this.supabase
      .from('document_comments')
      .insert([commentData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения комментария:', error);
      throw new Error(`Ошибка сохранения комментария: ${error.message}`);
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      userName: data.user_name,
      comment: data.comment,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getComments(documentId: string): Promise<DocumentComment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await this.supabase
      .from('document_comments')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Ошибка загрузки комментариев:', error);
      return [];
    }

    return (data || []).map((comment: any) => ({
      id: comment.id,
      documentId: comment.document_id,
      userId: comment.user_id,
      userName: comment.user_name,
      comment: comment.comment,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at)
    }));
  }

  async approveDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Требуется аутентификация для согласования документов');
    }

    // Получаем ФИО пользователя из таблицы users
    let userName = 'Пользователь';
    try {
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (!userError && userData) {
        userName = userData.full_name;
      } else {
        // Fallback к email если не найдено в таблице users
        userName = user.email || 'Пользователь';
      }
    } catch (error) {
      console.warn('Не удалось получить ФИО пользователя из таблицы users:', error);
      userName = user.email || 'Пользователь';
    }

    const approvalData = {
      document_id: documentId,
      user_id: user.id,
      user_name: userName,
      status: 'approved',
      comment: comment?.trim() || null
    };

    const { data, error } = await this.supabase
      .from('document_approvals')
      .insert([approvalData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения согласования:', error);
      throw new Error(`Ошибка сохранения согласования: ${error.message}`);
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      userName: data.user_name,
      status: data.status,
      comment: data.comment,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async rejectDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Требуется аутентификация для отклонения документов');
    }

    // Получаем ФИО пользователя из таблицы users
    let userName = 'Пользователь';
    try {
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (!userError && userData) {
        userName = userData.full_name;
      } else {
        // Fallback к email если не найдено в таблице users
        userName = user.email || 'Пользователь';
      }
    } catch (error) {
      console.warn('Не удалось получить ФИО пользователя из таблицы users:', error);
      userName = user.email || 'Пользователь';
    }

    const approvalData = {
      document_id: documentId,
      user_id: user.id,
      user_name: userName,
      status: 'rejected',
      comment: comment?.trim() || null
    };

    const { data, error } = await this.supabase
      .from('document_approvals')
      .insert([approvalData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения отклонения:', error);
      throw new Error(`Ошибка сохранения отклонения: ${error.message}`);
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      userName: data.user_name,
      status: data.status,
      comment: data.comment,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getApprovalStatus(documentId: string): Promise<DocumentApprovalStatus> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

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
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Требуется аутентификация для отмены согласования');
    }

    // Получаем ФИО пользователя из таблицы users
    let userName = 'Пользователь';
    try {
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (!userError && userData) {
        userName = userData.full_name;
      } else {
        // Fallback к email если не найдено в таблице users
        userName = user.email || 'Пользователь';
      }
    } catch (error) {
      console.warn('Не удалось получить ФИО пользователя из таблицы users:', error);
      userName = user.email || 'Пользователь';
    }

    const approvalData = {
      document_id: documentId,
      user_id: user.id,
      user_name: userName,
      status: 'pending',
      comment: comment?.trim() || 'Согласование отменено'
    };

    const { data, error } = await this.supabase
      .from('document_approvals')
      .insert([approvalData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения отмены согласования:', error);
      throw new Error(`Ошибка сохранения отмены согласования: ${error.message}`);
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      userName: data.user_name,
      status: data.status,
      comment: data.comment,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getApprovalHistory(documentId: string): Promise<ApprovalRecord[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await this.supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Ошибка загрузки истории согласований:', error);
      return [];
    }

    return (data || []).map((approval: any) => ({
      id: approval.id,
      documentId: approval.document_id,
      userId: approval.user_id,
      userName: approval.user_name,
      status: approval.status,
      comment: approval.comment,
      createdAt: new Date(approval.created_at),
      updatedAt: new Date(approval.updated_at)
    }));
  }
}

export const documentApprovalService = new DocumentApprovalService();

