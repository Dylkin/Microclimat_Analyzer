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
  private readonly STORAGE_KEY = 'project_documents';

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return true; // Всегда доступен, используем локальное хранение для файлов
  }

  // Получение сохраненных документов из localStorage
  private getStoredDocuments(): { [key: string]: any } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Ошибка чтения документов из localStorage:', error);
      return {};
    }
  }

  // Сохранение документов в localStorage
  private saveDocuments(documents: { [key: string]: any }): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Ошибка сохранения документов в localStorage:', error);
      throw new Error('Не удалось сохранить документ');
    }
  }

  // Конвертация файла в base64 для хранения
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Убираем префикс data:...;base64,
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  }

  // Конвертация base64 обратно в Blob
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Получение документов проекта
  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    try {
      const documents = this.getStoredDocuments();
      const projectDocuments = Object.values(documents).filter((doc: any) => doc.projectId === projectId);
      
      return projectDocuments.map((doc: any) => ({
        id: doc.id,
        projectId: doc.projectId,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileUrl: doc.fileUrl,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        uploadedAt: new Date(doc.uploadedAt)
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
    try {
      // Конвертируем файл в base64 для локального хранения
      const base64Content = await this.fileToBase64(file);
      
      // Создаем URL для файла
      const fileUrl = URL.createObjectURL(file);
      
      // Создаем документ
      const document: ProjectDocument = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        projectId,
        documentType,
        fileName: file.name,
        fileSize: file.size,
        fileUrl,
        mimeType: file.type,
        uploadedBy: userId || 'anonymous',
        uploadedAt: new Date()
      };
      
      // Сохраняем в localStorage
      const documents = this.getStoredDocuments();
      documents[document.id] = {
        ...document,
        base64Content,
        uploadedAt: document.uploadedAt.toISOString()
      };
      
      // Удаляем старый документ того же типа для этого проекта
      Object.keys(documents).forEach(key => {
        const doc = documents[key];
        if (doc.projectId === projectId && doc.documentType === documentType && doc.id !== document.id) {
          // Освобождаем URL старого файла
          if (doc.fileUrl && doc.fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(doc.fileUrl);
          }
          delete documents[key];
        }
      });
      
      this.saveDocuments(documents);
      
      return document;
    } catch (error) {
      console.error('Ошибка при загрузке документа:', error);
      throw error;
    }
  }

  // Удаление документа
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const documents = this.getStoredDocuments();
      const document = documents[documentId];
      
      if (document) {
        // Освобождаем URL файла
        if (document.fileUrl && document.fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(document.fileUrl);
        }
        
        // Удаляем из хранилища
        delete documents[documentId];
        this.saveDocuments(documents);
      }
    } catch (error) {
      console.error('Ошибка при удалении документа:', error);
      throw error;
    }
  }

  // Скачивание документа
  async downloadDocument(fileUrl: string): Promise<Blob> {
    try {
      // Если это blob URL, получаем файл напрямую
      if (fileUrl.startsWith('blob:')) {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Ошибка загрузки файла');
        }
        return await response.blob();
      }
      
      // Иначе ищем в localStorage по URL
      const documents = this.getStoredDocuments();
      const document = Object.values(documents).find((doc: any) => doc.fileUrl === fileUrl);
      
      if (!document) {
        throw new Error('Документ не найден');
      }
      
      // Конвертируем base64 обратно в Blob
      return this.base64ToBlob(document.base64Content, document.mimeType);
    } catch (error) {
      console.error('Ошибка при скачивании документа:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const projectDocumentService = new ProjectDocumentService();