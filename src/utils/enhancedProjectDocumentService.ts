import { apiClient } from './apiClient';
import { ProjectDocument, projectDocumentService } from './projectDocumentService';
import { qualificationProtocolService, QualificationProtocol, QualificationProtocolWithDocument } from './qualificationProtocolService';
import { getSafeObjectType } from './objectTypeMapping';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';

class EnhancedProjectDocumentService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Загрузка документа с поддержкой протоколов квалификации
  async uploadDocument(
    projectId: string,
    documentType: 'commercial_offer' | 'contract' | 'qualification_protocol',
    file: File,
    userId?: string,
    objectType?: string,
    objectName?: string,
    qualificationObjectId?: string
  ): Promise<ProjectDocument> {
    try {
      // Используем базовый сервис для загрузки документа
      const projectDocument = await projectDocumentService.uploadDocument(
        projectId,
        documentType,
        file,
        userId
      );

      // Если это протокол квалификации, создаем запись в qualification_protocols
      if (documentType === 'qualification_protocol' && objectType && objectName) {
        try {
          await qualificationProtocolService.createProtocol(
            projectId,
            objectType,
            objectName,
            projectDocument.id,
            qualificationObjectId
          );
        } catch (protocolError) {
          console.warn('Ошибка создания записи протокола квалификации:', protocolError);
          // Не прерываем процесс, так как документ уже загружен
        }
      }

      return projectDocument;
    } catch (error: any) {
      console.error('Ошибка при загрузке документа:', error);
      throw new Error(`Ошибка загрузки документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение документов проекта с протоколами квалификации
  async getProjectDocuments(projectId: string): Promise<{
    regularDocuments: ProjectDocument[];
    qualificationProtocols: QualificationProtocolWithDocument[];
  }> {
    try {
      // Получаем все документы проекта
      const allDocuments = await projectDocumentService.getProjectDocuments(projectId);
      
      // Разделяем на обычные документы и протоколы
      const regularDocuments = allDocuments.filter(
        doc => doc.documentType === 'commercial_offer' || doc.documentType === 'contract'
      );

      // Получаем протоколы квалификации
      const qualificationProtocols = await qualificationProtocolService.getProjectProtocols(projectId);

      return {
        regularDocuments,
        qualificationProtocols
      };
    } catch (error: any) {
      console.error('Ошибка при получении документов проекта:', error);
      throw new Error(`Ошибка получения документов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Получаем информацию о документе
      const allDocs = await projectDocumentService.getProjectDocuments('');
      const docData = allDocs.find(doc => doc.id === documentId);

      if (!docData) {
        throw new Error('Документ не найден');
      }

      // Если это протокол квалификации, удаляем запись из qualification_protocols
      if (docData.documentType === 'qualification_protocol') {
        try {
          const protocols = await qualificationProtocolService.getProjectProtocols(docData.projectId);
          const protocol = protocols.find(p => p.protocolDocumentId === documentId);
          if (protocol) {
            await qualificationProtocolService.deleteProtocol(protocol.id);
          }
        } catch (protocolError) {
          console.warn('Ошибка удаления записи протокола квалификации:', protocolError);
        }
      }

      // Удаляем документ через базовый сервис
      await projectDocumentService.deleteDocument(documentId);
    } catch (error: any) {
      console.error('Ошибка при удалении документа:', error);
      throw new Error(`Ошибка удаления документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение статистики документов проекта
  async getProjectDocumentStats(projectId: string): Promise<{
    totalDocuments: number;
    commercialOffers: number;
    contracts: number;
    qualificationProtocols: number;
    approvedProtocols: number;
    pendingProtocols: number;
  }> {
    try {
      // Получаем все документы проекта
      const { regularDocuments } = await this.getProjectDocuments(projectId);
      
      // Получаем статистику протоколов
      const protocolStats = await qualificationProtocolService.getProjectProtocolStats(projectId);

      return {
        totalDocuments: regularDocuments.length + protocolStats.total,
        commercialOffers: regularDocuments.filter(d => d.documentType === 'commercial_offer').length,
        contracts: regularDocuments.filter(d => d.documentType === 'contract').length,
        qualificationProtocols: protocolStats.total,
        approvedProtocols: protocolStats.approved,
        pendingProtocols: protocolStats.pending
      };
    } catch (error: any) {
      console.error('Ошибка при получении статистики документов:', error);
      throw new Error(`Ошибка получения статистики: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const enhancedProjectDocumentService = new EnhancedProjectDocumentService();
