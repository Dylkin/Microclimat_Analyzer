import { supabase, SupabaseClient } from './supabaseClient';
import { ProjectDocument } from './projectDocumentService';
import { qualificationProtocolService, QualificationProtocol, QualificationProtocolWithDocument } from './qualificationProtocolService';
import { getSafeObjectType } from './objectTypeMapping';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';

interface DatabaseProjectDocument {
  id: string;
  project_id: string;
  document_type: 'commercial_offer' | 'contract' | 'qualification_protocol';
  file_name: string;
  file_size: number;
  file_url: string;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

class EnhancedProjectDocumentService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return !!this.supabase;
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
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    // Проверяем аутентификацию пользователя
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Требуется аутентификация для загрузки файлов. Пожалуйста, войдите в систему.');
    }

    try {
      // Генерируем уникальное имя файла
      const sanitizedOriginalName = sanitizeFileName(file.name);
      const fileExt = sanitizedOriginalName.split('.').pop();
      const timestamp = Date.now();
      
      const safeObjectType = objectType ? getSafeObjectType(objectType) : '';
      
      const fileName = documentType === 'qualification_protocol' 
        ? `${projectId}_qualification_protocol_${safeObjectType}_${timestamp}.${fileExt}`
        : `${projectId}_${documentType}_${timestamp}.${fileExt}`;

      // Загружаем файл в Storage
      const mimeType = getMimeType(file.name);
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(`project-documents/${fileName}`, file, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Ошибка загрузки файла:', uploadError);
        throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
      }

      // Получаем публичный URL
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(`project-documents/${fileName}`);

      // Сохраняем информацию о документе в базе данных
      const { data: docData, error: docError } = await this.supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          document_type: documentType,
          file_name: fileName,
          file_size: file.size,
          file_url: urlData.publicUrl,
          mime_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (docError) {
        console.error('Ошибка сохранения документа:', docError);
        throw new Error(`Ошибка сохранения документа: ${docError.message}`);
      }

      const projectDocument: ProjectDocument = {
        id: docData.id,
        projectId: docData.project_id,
        documentType: docData.document_type,
        fileName: docData.file_name,
        fileSize: docData.file_size,
        fileUrl: docData.file_url,
        mimeType: docData.mime_type,
        uploadedBy: docData.uploaded_by,
        uploadedAt: new Date(docData.uploaded_at)
      };

      // Если это протокол квалификации, создаем запись в qualification_protocols
      if (documentType === 'qualification_protocol' && objectType && objectName) {
        try {
          await qualificationProtocolService.createProtocol(
            projectId,
            objectType,
            objectName,
            docData.id,
            qualificationObjectId
          );
        } catch (protocolError) {
          console.warn('Ошибка создания записи протокола квалификации:', protocolError);
          // Не прерываем процесс, так как документ уже загружен
        }
      }

      return projectDocument;
    } catch (error) {
      console.error('Ошибка при загрузке документа:', error);
      throw error;
    }
  }

  // Получение документов проекта с протоколами квалификации
  async getProjectDocuments(projectId: string): Promise<{
    regularDocuments: ProjectDocument[];
    qualificationProtocols: QualificationProtocolWithDocument[];
  }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем обычные документы
      const { data: regularDocs, error: regularError } = await this.supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .in('document_type', ['commercial_offer', 'contract'])
        .order('uploaded_at', { ascending: false });

      if (regularError) {
        console.error('Ошибка получения обычных документов:', regularError);
        throw new Error(`Ошибка получения документов: ${regularError.message}`);
      }

      // Получаем протоколы квалификации
      const qualificationProtocols = await qualificationProtocolService.getProjectProtocols(projectId);

      return {
        regularDocuments: regularDocs.map((doc: DatabaseProjectDocument) => ({
          id: doc.id,
          projectId: doc.project_id,
          documentType: doc.document_type,
          fileName: doc.file_name,
          fileSize: doc.file_size,
          fileUrl: doc.file_url,
          mimeType: doc.mime_type,
          uploadedBy: doc.uploaded_by || 'unknown',
          uploadedAt: new Date(doc.uploaded_at)
        })),
        qualificationProtocols
      };
    } catch (error) {
      console.error('Ошибка при получении документов проекта:', error);
      throw error;
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем информацию о документе
      const { data: docData, error: docError } = await this.supabase
        .from('project_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) {
        console.error('Ошибка получения документа для удаления:', docError);
        throw new Error(`Ошибка получения документа: ${docError.message}`);
      }

      // Удаляем файл из Storage
      const fileName = docData.file_name;
      const { error: storageError } = await this.supabase.storage
        .from('documents')
        .remove([`project-documents/${fileName}`]);

      if (storageError) {
        console.warn('Ошибка удаления файла из Storage:', storageError);
        // Не прерываем процесс, так как запись в БД все равно нужно удалить
      }

      // Если это протокол квалификации, удаляем запись из qualification_protocols
      if (docData.document_type === 'qualification_protocol') {
        try {
          const { data: protocolData, error: protocolError } = await this.supabase
            .from('qualification_protocols')
            .select('id')
            .eq('protocol_document_id', documentId)
            .single();

          if (!protocolError && protocolData) {
            await qualificationProtocolService.deleteProtocol(protocolData.id);
          }
        } catch (protocolError) {
          console.warn('Ошибка удаления записи протокола квалификации:', protocolError);
        }
      }

      // Удаляем запись из project_documents
      const { error: deleteError } = await this.supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Ошибка удаления документа из БД:', deleteError);
        throw new Error(`Ошибка удаления документа: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении документа:', error);
      throw error;
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
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем обычные документы
      const { data: regularDocs, error: regularError } = await this.supabase
        .from('project_documents')
        .select('document_type')
        .eq('project_id', projectId)
        .in('document_type', ['commercial_offer', 'contract']);

      if (regularError) {
        console.error('Ошибка получения статистики документов:', regularError);
        throw new Error(`Ошибка получения статистики: ${regularError.message}`);
      }

      // Получаем статистику протоколов
      const protocolStats = await qualificationProtocolService.getProjectProtocolStats(projectId);

      return {
        totalDocuments: regularDocs.length + protocolStats.total,
        commercialOffers: regularDocs.filter(d => d.document_type === 'commercial_offer').length,
        contracts: regularDocs.filter(d => d.document_type === 'contract').length,
        qualificationProtocols: protocolStats.total,
        approvedProtocols: protocolStats.approved,
        pendingProtocols: protocolStats.pending
      };
    } catch (error) {
      console.error('Ошибка при получении статистики документов:', error);
      throw error;
    }
  }
}

export const enhancedProjectDocumentService = new EnhancedProjectDocumentService();
