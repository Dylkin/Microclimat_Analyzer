import { createClient } from '@supabase/supabase-js';

// Получаем конфигурацию Supabase из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

// Инициализация Supabase клиента
const initSupabase = () => {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

export interface ProjectDocument {
  id: string;
  projectId: string;
  documentType: 'commercial_offer' | 'contract';
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface DatabaseProjectDocument {
  id: string;
  project_id: string;
  document_type: 'commercial_offer' | 'contract';
  file_name: string;
  file_size: number;
  file_url: string;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
}

export class ProjectDocumentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение документов проекта
  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения документов проекта:', error);
        throw new Error(`Ошибка получения документов: ${error.message}`);
      }

      return data.map((doc: DatabaseProjectDocument) => ({
        id: doc.id,
        projectId: doc.project_id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        fileUrl: doc.file_url,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
        uploadedAt: new Date(doc.uploaded_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении документов проекта:', error);
      throw error;
    }
  }

  // Загрузка документа
  async uploadDocument(
    projectId: string, 
    documentType: 'commercial_offer' | 'contract', 
    file: File,
    userId?: string
  ): Promise<ProjectDocument> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `project-documents/${fileName}`;

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Ошибка загрузки файла в Storage:', uploadError);
        throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
      }

      // Получаем публичный URL файла
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Сохраняем информацию о документе в базе данных
      const { data: docData, error: docError } = await this.supabase
        .from('project_documents')
        .upsert({
          project_id: projectId,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          file_url: urlData.publicUrl,
          mime_type: file.type,
          uploaded_by: userId || 'anonymous'
        })
        .select()
        .single();

      if (docError) {
        console.error('Ошибка сохранения информации о документе:', docError);
        throw new Error(`Ошибка сохранения документа: ${docError.message}`);
      }

      return {
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
    } catch (error) {
      console.error('Ошибка при загрузке документа:', error);
      throw error;
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Сначала получаем информацию о документе для удаления файла из Storage
      const { data: docData, error: getError } = await this.supabase
        .from('project_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (getError) {
        console.error('Ошибка получения информации о документе:', getError);
        throw new Error(`Ошибка получения документа: ${getError.message}`);
      }

      // Извлекаем путь файла из URL
      const filePath = docData.file_url.split('/').pop();
      if (filePath) {
        // Удаляем файл из Storage
        const { error: storageError } = await this.supabase.storage
          .from('documents')
          .remove([`project-documents/${filePath}`]);

        if (storageError) {
          console.warn('Ошибка удаления файла из Storage:', storageError);
          // Не прерываем выполнение, так как запись в БД все равно нужно удалить
        }
      }

      // Удаляем запись из базы данных
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