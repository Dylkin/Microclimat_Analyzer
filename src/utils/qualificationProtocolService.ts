import { apiClient } from './apiClient';
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
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Получение протоколов квалификации для проекта
  async getProjectProtocols(projectId: string): Promise<QualificationProtocolWithDocument[]> {
    try {
      const data = await apiClient.get<any[]>(`/qualification-protocols?project_id=${projectId}`);
      
      console.log('QualificationProtocolService: Получены данные протоколов:', data);
      
      return (data || []).map((row: any) => {
        // Бэкенд возвращает document как объект, если document_id существует
        const document = row.document && row.document.id ? {
          id: row.document.id,
          projectId: row.projectId || row.project_id,
          documentType: 'qualification_protocol' as const,
          fileName: row.document.fileName || row.document.file_name,
          fileSize: row.document.fileSize || row.document.file_size,
          fileUrl: row.document.fileUrl || row.document.file_url,
          mimeType: row.document.mimeType || row.document.mime_type,
          uploadedBy: row.document.uploadedBy || row.document.uploaded_by,
          uploadedAt: row.document.uploadedAt ? new Date(row.document.uploadedAt) : (row.document.uploaded_at ? new Date(row.document.uploaded_at) : new Date())
        } : undefined;

        console.log('QualificationProtocolService: Обработан протокол:', {
          id: row.id,
          objectType: row.objectType || row.object_type,
          hasDocument: !!document,
          fileUrl: document?.fileUrl
        });

        return {
          id: row.id,
          projectId: row.projectId || row.project_id,
          qualificationObjectId: row.qualificationObjectId || row.qualification_object_id,
          objectType: row.objectType || row.object_type,
          objectName: row.objectName || row.object_name,
          protocolDocumentId: row.protocolDocumentId || row.protocol_document_id,
          status: row.status,
          approvedBy: row.approvedBy || row.approved_by,
          approvedAt: row.approvedAt ? new Date(row.approvedAt) : (row.approved_at ? new Date(row.approved_at) : undefined),
          rejectionReason: row.rejectionReason || row.rejection_reason,
          createdAt: row.createdAt ? new Date(row.createdAt) : (row.created_at ? new Date(row.created_at) : new Date()),
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : (row.updated_at ? new Date(row.updated_at) : new Date()),
          document
        };
      }).filter((p: any) => p.document && p.document.fileUrl) as QualificationProtocolWithDocument[];
    } catch (error: any) {
      console.error('Ошибка при получении протоколов квалификации:', error);
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
    try {
      const data = await apiClient.post<any>('/qualification-protocols', {
        projectId,
        qualificationObjectId,
        objectType,
        objectName,
        protocolDocumentId: documentId,
        status: 'pending'
      });

      return {
        id: data.id,
        projectId: data.projectId || data.project_id,
        qualificationObjectId: data.qualificationObjectId || data.qualification_object_id,
        objectType: data.objectType || data.object_type,
        objectName: data.objectName || data.object_name,
        protocolDocumentId: data.protocolDocumentId || data.protocol_document_id,
        status: data.status,
        approvedBy: data.approvedBy || data.approved_by,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : (data.approved_at ? new Date(data.approved_at) : undefined),
        rejectionReason: data.rejectionReason || data.rejection_reason,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при создании протокола квалификации:', error);
      throw new Error(`Ошибка создания протокола: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление статуса протокола
  async updateProtocolStatus(
    protocolId: string,
    status: 'pending' | 'approved' | 'rejected',
    approvedBy?: string,
    rejectionReason?: string
  ): Promise<QualificationProtocol> {
    try {
      const data = await apiClient.put<any>(`/qualification-protocols/${protocolId}`, {
        status,
        approvedBy,
        rejectionReason
      });

      return {
        id: data.id,
        projectId: data.projectId || data.project_id,
        qualificationObjectId: data.qualificationObjectId || data.qualification_object_id,
        objectType: data.objectType || data.object_type,
        objectName: data.objectName || data.object_name,
        protocolDocumentId: data.protocolDocumentId || data.protocol_document_id,
        status: data.status,
        approvedBy: data.approvedBy || data.approved_by,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : (data.approved_at ? new Date(data.approved_at) : undefined),
        rejectionReason: data.rejectionReason || data.rejection_reason,
        createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса протокола:', error);
      throw new Error(`Ошибка обновления статуса: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление протокола квалификации
  async deleteProtocol(protocolId: string): Promise<void> {
    try {
      await apiClient.delete(`/qualification-protocols/${protocolId}`);
    } catch (error: any) {
      console.error('Ошибка при удалении протокола квалификации:', error);
      throw new Error(`Ошибка удаления протокола: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение протокола по ID
  async getProtocolById(protocolId: string): Promise<QualificationProtocolWithDocument | null> {
    try {
      const protocols = await this.getProjectProtocols(''); // Получаем все протоколы
      const protocol = protocols.find(p => p.id === protocolId);
      return protocol || null;
    } catch (error: any) {
      console.error('Ошибка при получении протокола:', error);
      throw new Error(`Ошибка получения протокола: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение статистики протоколов для проекта
  async getProjectProtocolStats(projectId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const protocols = await this.getProjectProtocols(projectId);
      const stats = {
        total: protocols.length,
        pending: protocols.filter(p => p.status === 'pending').length,
        approved: protocols.filter(p => p.status === 'approved').length,
        rejected: protocols.filter(p => p.status === 'rejected').length
      };
      return stats;
    } catch (error: any) {
      console.error('Ошибка при получении статистики протоколов:', error);
      throw new Error(`Ошибка получения статистики: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const qualificationProtocolService = new QualificationProtocolService();
