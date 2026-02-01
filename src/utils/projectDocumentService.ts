import { apiClient } from './apiClient';
import { sanitizeFileName } from './fileNameUtils';
import { getMimeType } from './mimeTypeUtils';

export interface ProjectDocument {
  id: string;
  projectId: string;
  documentType: 'commercial_offer' | 'contract' | 'qualification_protocol';
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

class ProjectDocumentService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Получение документов проекта
  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    try {
      const data = await apiClient.get<any[]>(`/project-documents?project_id=${projectId}`);
      
      return data.map((doc: any) => {
        // Определяем тип документа: если в имени файла есть qualification_protocol, то это протокол
        let documentType = doc.documentType || doc.document_type;
        if ((doc.fileName || doc.file_name)?.includes('qualification_protocol')) {
          documentType = 'qualification_protocol';
        }
        
        return {
          id: doc.id,
          projectId: doc.projectId || doc.project_id,
          documentType: documentType as 'commercial_offer' | 'contract' | 'qualification_protocol',
          fileName: doc.fileName || doc.file_name,
          fileSize: doc.fileSize || doc.file_size,
          fileUrl: doc.fileUrl || doc.file_url,
          mimeType: doc.mimeType || doc.mime_type,
          uploadedBy: doc.uploadedBy || doc.uploaded_by,
          uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : (doc.uploaded_at ? new Date(doc.uploaded_at) : new Date())
        };
      });
    } catch (error: any) {
      console.error('Ошибка при получении документов проекта:', error);
      throw new Error(`Ошибка получения документов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Загрузка документа
  async uploadDocument(
    projectId: string, 
    documentType: 'commercial_offer' | 'contract' | 'qualification_protocol', 
    file: File,
    userId?: string
  ): Promise<ProjectDocument> {
    try {
      // Генерируем уникальное имя файла
      const sanitizedOriginalName = sanitizeFileName(file.name);
      const fileExt = sanitizedOriginalName.split('.').pop();
      const fileName = `${projectId}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `project-documents/${fileName}`;

      console.log('Загружаем файл в Storage:', { fileName, filePath, fileSize: file.size });

      // Загружаем файл через API
      const mimeType = getMimeType(file.name);
      const uploadResult = await apiClient.uploadFile('/storage/upload', file, {
        bucket: 'documents',
        path: filePath
      });

      const publicUrl = uploadResult.data?.publicUrl || `/uploads/documents/${filePath}`;
      console.log('Получен публичный URL:', publicUrl);

      // Сохраняем информацию о документе в базе данных
      const docData = await apiClient.post<any>('/project-documents', {
        projectId,
        documentType,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: publicUrl,
        mimeType: mimeType,
        uploadedBy: userId || null
      });

      console.log('Информация о документе сохранена в БД:', docData);

      return {
        id: docData.id,
        projectId: docData.projectId || docData.project_id,
        documentType: documentType,
        fileName: docData.fileName || docData.file_name,
        fileSize: docData.fileSize || docData.file_size,
        fileUrl: docData.fileUrl || docData.file_url,
        mimeType: docData.mimeType || docData.mime_type,
        uploadedBy: docData.uploadedBy || docData.uploaded_by,
        uploadedAt: docData.uploadedAt ? new Date(docData.uploadedAt) : (docData.uploaded_at ? new Date(docData.uploaded_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при загрузке документа:', error);
      throw new Error(`Ошибка загрузки документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Получаем информацию о документе для удаления файла из Storage
      const docData = await apiClient.get<any>(`/project-documents?project_id=&id=${documentId}`);
      
      // Удаляем файл из Storage, если есть URL
      if (docData && docData.length > 0 && docData[0].fileUrl) {
        const fileUrl = docData[0].fileUrl || docData[0].file_url;
        const filePath = fileUrl.split('/').pop();
        if (filePath) {
          try {
            await apiClient.post('/storage/remove', {
              bucket: 'documents',
              paths: [`project-documents/${filePath}`]
            });
          } catch (storageError) {
            console.warn('Ошибка удаления файла из Storage:', storageError);
            // Не прерываем выполнение
          }
        }
      }

      // Удаляем запись из базы данных
      await apiClient.delete(`/project-documents/${documentId}`);
    } catch (error: any) {
      console.error('Ошибка при удалении документа:', error);
      throw new Error(`Ошибка удаления документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Скачивание документа
  async downloadDocument(fileUrl: string): Promise<Blob> {
    try {
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      return await response.blob();
    } catch (error) {
      console.error('Ошибка при скачивании документа:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const projectDocumentService = new ProjectDocumentService();