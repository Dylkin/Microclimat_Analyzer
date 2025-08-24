import { createClient } from '@supabase/supabase-js';
import { 
  ProjectDocument, 
  DocumentType,
  CreateProjectDocumentData,
  DatabaseProjectDocument
} from '../types/ProjectDocument';

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

export class ProjectDocumentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Конвертация файла в ArrayBuffer
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Сохранение документа проекта
  async saveDocument(documentData: CreateProjectDocumentData, qualificationObjectId?: string): Promise<ProjectDocument> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Сохраняем документ проекта:', {
        projectId: documentData.projectId,
        documentType: documentData.documentType,
        fileName: documentData.file.name,
        fileSize: documentData.file.size
      });

      // Конвертируем файл в бинарные данные
      const fileBuffer = await this.fileToArrayBuffer(documentData.file);
      const fileBytes = new Uint8Array(fileBuffer);

      // Подготавливаем данные для вставки
      const insertData = {
        project_id: documentData.projectId,
        document_type: documentData.documentType,
        file_name: documentData.file.name,
        file_size: documentData.file.size,
        file_content: fileBytes,
        mime_type: documentData.file.type,
        uploaded_by: documentData.uploadedBy || null,
        qualification_object_id: qualificationObjectId || null
      };

      // Для схемы расстановки и данных испытаний используем уникальность по проекту + объект + тип
      // Для остальных документов - по проекту + тип
      const { data, error } = await this.supabase
        .from('project_documents')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Ошибка сохранения документа:', error);
        throw new Error(`Ошибка сохранения документа: ${error.message}`);
      }

      console.log('Документ успешно сохранен:', data.id);

      return {
        id: data.id,
        projectId: data.project_id,
        documentType: data.document_type,
        fileName: data.file_name,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        uploadedBy: data.uploaded_by || undefined,
        uploadedAt: new Date(data.uploaded_at),
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при сохранении документа проекта:', error);
      throw error;
    }
  }

  // Получение документов проекта
  async getProjectDocuments(projectId: string, qualificationObjectId?: string): Promise<ProjectDocument[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Загружаем документы проекта:', projectId);

      let query = this.supabase
        .from('project_documents')
        .select(`
          id,
          project_id,
          document_type,
          file_name,
          file_size,
          mime_type,
          uploaded_by,
          uploaded_at,
          created_at,
          qualification_object_id
        `)
        .eq('project_id', projectId);

      // Если указан объект квалификации, фильтруем по нему или берем общие документы проекта
      if (qualificationObjectId) {
        query = query.or(`qualification_object_id.eq.${qualificationObjectId},qualification_object_id.is.null`);
      } else {
        query = query.is('qualification_object_id', null);
      }

      const { data, error } = await query
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения документов проекта:', error);
        throw new Error(`Ошибка получения документов проекта: ${error.message}`);
      }

      // Получаем информацию о пользователях для отображения имен
      const userIds = data
        .map((doc: any) => doc.uploaded_by)
        .filter((id: string | null) => id !== null);

      let usersMap = new Map<string, string>();
      if (userIds.length > 0) {
        try {
          const { data: usersData } = await this.supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (usersData) {
            usersMap = new Map(usersData.map((u: any) => [u.id, u.full_name]));
          }
        } catch (userError) {
          console.warn('Ошибка получения информации о пользователях:', userError);
        }
      }

      console.log('Загружено документов проекта:', data.length);

      return data.map((doc: any) => ({
        id: doc.id,
        projectId: doc.project_id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by || undefined,
        uploadedByName: doc.uploaded_by ? usersMap.get(doc.uploaded_by) : undefined,
        uploadedAt: new Date(doc.uploaded_at),
        createdAt: new Date(doc.created_at),
        qualificationObjectId: doc.qualification_object_id || undefined
      }));
    } catch (error) {
      console.error('Ошибка при получении документов проекта:', error);
      throw error;
    }
  }

  // Получение содержимого документа для скачивания
  async getDocumentContent(documentId: string): Promise<Blob> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Получаем содержимое документа:', documentId);

      const { data, error } = await this.supabase
        .from('project_documents')
        .select('file_content, mime_type, file_name')
        .eq('id', documentId)
        .single();

      if (error) {
        console.error('Ошибка получения содержимого документа:', error);
        throw new Error(`Ошибка получения содержимого документа: ${error.message}`);
      }

      // Конвертируем бинарные данные в Blob
      const blob = new Blob([data.file_content], { type: data.mime_type });
      
      console.log('Содержимое документа получено, размер:', blob.size, 'байт');
      
      return blob;
    } catch (error) {
      console.error('Ошибка при получении содержимого документа:', error);
      throw error;
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Удаляем документ:', documentId);

      const { error } = await this.supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Ошибка удаления документа:', error);
        throw new Error(`Ошибка удаления документа: ${error.message}`);
      }

      console.log('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении документа:', error);
      throw error;
    }
  }

  // Проверка существования документа определенного типа для проекта
  async hasDocument(projectId: string, documentType: DocumentType): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { data, error } = await this.supabase
        .from('project_documents')
        .select('id')
        .eq('project_id', projectId)
        .eq('document_type', documentType)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }
}

// Экспорт синглтона сервиса
export const projectDocumentService = new ProjectDocumentService();