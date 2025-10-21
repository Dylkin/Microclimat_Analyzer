import { supabase, SupabaseClient } from './supabaseClient';
import { ProjectDocument } from './projectDocumentService';
import { extractObjectTypeFromFileName, getObjectTypeDisplayName } from './objectTypeMapping';

export interface QualificationProtocol {
  id: string;
  projectId: string;
  qualificationObjectId?: string;
  objectType: string;
  objectName?: string;
  protocolDocumentId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // Документ протокола
  document?: ProjectDocument;
}

export interface QualificationProtocolWithDocument extends QualificationProtocol {
  document: ProjectDocument;
}

class QualificationProtocolService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение протоколов квалификации для проекта
  async getProjectProtocols(projectId: string): Promise<QualificationProtocolWithDocument[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Сначала пытаемся использовать представление
      let data: any[] = [];
      let error: any = null;

      try {
        const result = await this.supabase
          .from('qualification_protocols_with_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        data = result.data || [];
        error = result.error;
      } catch (viewError) {
        console.warn('Представление qualification_protocols_with_documents не найдено, используем альтернативный запрос');
        
        // Альтернативный запрос через JOIN
        const result = await this.supabase
          .from('qualification_protocols')
          .select(`
            *,
            project_documents!inner(
              id,
              file_name,
              file_size,
              file_url,
              mime_type,
              uploaded_by,
              uploaded_at
            )
          `)
          .eq('project_id', projectId)
          .eq('project_documents.document_type', 'qualification_protocol')
          .order('created_at', { ascending: false });
        
        data = result.data || [];
        error = result.error;
      }

      if (error) {
        console.error('Ошибка получения протоколов квалификации:', error);
        // Не выбрасываем ошибку, возвращаем пустой массив
        console.warn('Возвращаем пустой массив протоколов из-за ошибки загрузки');
        return [];
      }

      return data.map((row: any) => {
        // Обрабатываем данные в зависимости от источника
        const documentData = row.project_documents || {
          id: row.document_id,
          file_name: row.file_name,
          file_size: row.file_size,
          file_url: row.file_url,
          mime_type: row.mime_type,
          uploaded_by: row.uploaded_by,
          uploaded_at: row.uploaded_at
        };

        return {
          id: row.id,
          projectId: row.project_id,
          qualificationObjectId: row.qualification_object_id,
          objectType: row.object_type,
          objectName: row.object_name,
          protocolDocumentId: row.protocol_document_id,
          status: row.status,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
          rejectionReason: row.rejection_reason,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          document: {
            id: documentData.id,
            projectId: row.project_id,
            documentType: 'qualification_protocol' as const,
            fileName: documentData.file_name,
            fileSize: documentData.file_size,
            fileUrl: documentData.file_url,
            mimeType: documentData.mime_type,
            uploadedBy: documentData.uploaded_by,
            uploadedAt: new Date(documentData.uploaded_at)
          }
        };
      });
    } catch (error) {
      console.error('Ошибка при получении протоколов квалификации:', error);
      // Возвращаем пустой массив вместо выброса ошибки
      console.warn('Возвращаем пустой массив протоколов из-за ошибки');
      return [];
    }
  }

  // Создание протокола квалификации
  async createProtocol(
    projectId: string,
    objectType: string,
    objectName: string,
    documentId: string,
    qualificationObjectId?: string
  ): Promise<QualificationProtocol> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_protocols')
        .insert({
          project_id: projectId,
          qualification_object_id: qualificationObjectId,
          object_type: objectType,
          object_name: objectName,
          protocol_document_id: documentId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания протокола квалификации:', error);
        throw new Error(`Ошибка создания протокола: ${error.message}`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        objectType: data.object_type,
        objectName: data.object_name,
        protocolDocumentId: data.protocol_document_id,
        status: data.status,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
        rejectionReason: data.rejection_reason,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при создании протокола квалификации:', error);
      throw error;
    }
  }

  // Обновление статуса протокола
  async updateProtocolStatus(
    protocolId: string,
    status: 'pending' | 'approved' | 'rejected',
    approvedBy?: string,
    rejectionReason?: string
  ): Promise<QualificationProtocol> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
        updateData.rejection_reason = null;
      } else if (status === 'rejected') {
        updateData.rejection_reason = rejectionReason;
        updateData.approved_by = null;
        updateData.approved_at = null;
      } else {
        // pending
        updateData.approved_by = null;
        updateData.approved_at = null;
        updateData.rejection_reason = null;
      }

      const { data, error } = await this.supabase
        .from('qualification_protocols')
        .update(updateData)
        .eq('id', protocolId)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления статуса протокола:', error);
        throw new Error(`Ошибка обновления статуса: ${error.message}`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        objectType: data.object_type,
        objectName: data.object_name,
        protocolDocumentId: data.protocol_document_id,
        status: data.status,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
        rejectionReason: data.rejection_reason,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении статуса протокола:', error);
      throw error;
    }
  }

  // Удаление протокола квалификации
  async deleteProtocol(protocolId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('qualification_protocols')
        .delete()
        .eq('id', protocolId);

      if (error) {
        console.error('Ошибка удаления протокола квалификации:', error);
        throw new Error(`Ошибка удаления протокола: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении протокола квалификации:', error);
      throw error;
    }
  }

  // Получение протокола по ID
  async getProtocolById(protocolId: string): Promise<QualificationProtocolWithDocument | null> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_protocols_with_documents')
        .select('*')
        .eq('id', protocolId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Протокол не найден
        }
        console.error('Ошибка получения протокола:', error);
        throw new Error(`Ошибка получения протокола: ${error.message}`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        objectType: data.object_type,
        objectName: data.object_name,
        protocolDocumentId: data.protocol_document_id,
        status: data.status,
        approvedBy: data.approved_by,
        approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
        rejectionReason: data.rejection_reason,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        document: {
          id: data.document_id,
          projectId: data.project_id,
          documentType: 'qualification_protocol' as const,
          fileName: data.file_name,
          fileSize: data.file_size,
          fileUrl: data.file_url,
          mimeType: data.mime_type,
          uploadedBy: data.uploaded_by,
          uploadedAt: new Date(data.uploaded_at)
        }
      };
    } catch (error) {
      console.error('Ошибка при получении протокола:', error);
      throw error;
    }
  }

  // Получение статистики протоколов для проекта
  async getProjectProtocolStats(projectId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_protocols')
        .select('status')
        .eq('project_id', projectId);

      if (error) {
        console.error('Ошибка получения статистики протоколов:', error);
        throw new Error(`Ошибка получения статистики: ${error.message}`);
      }

      const stats = {
        total: data.length,
        pending: data.filter(p => p.status === 'pending').length,
        approved: data.filter(p => p.status === 'approved').length,
        rejected: data.filter(p => p.status === 'rejected').length
      };

      return stats;
    } catch (error) {
      console.error('Ошибка при получении статистики протоколов:', error);
      throw error;
    }
  }
}

export const qualificationProtocolService = new QualificationProtocolService();
