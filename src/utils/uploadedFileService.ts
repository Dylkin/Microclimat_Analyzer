import { createClient } from '@supabase/supabase-js';
import { UploadedFile } from '../types/FileData';
import { QualificationObjectType } from '../types/QualificationObject';

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

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export interface DatabaseUploadedFile {
  id: string;
  user_id: string | null;
  name: string;
  original_name: string;
  upload_date: string;
  parsing_status: string;
  error_message: string | null;
  record_count: number;
  period_start: string | null;
  period_end: string | null;
  zone_number: number | null;
  measurement_level: string | null;
  file_order: number;
  object_type: QualificationObjectType | null;
  created_at: string;
  updated_at: string;
}

export interface SaveFileData {
  projectId: string;
  qualificationObjectId: string;
  objectType: QualificationObjectType;
  files: UploadedFile[];
}

export class UploadedFileService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Сохранение файлов в связке с проектом
  async saveProjectFiles(saveData: SaveFileData, userId: string | null): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    if (!userId || !isValidUUID(userId)) {
      throw new Error('Невалидный ID пользователя');
    }

    try {
      console.log('Сохраняем файлы проекта:', saveData);

      // Подготавливаем данные для вставки
      const filesToInsert = saveData.files.map(file => ({
        id: file.id,
        user_id: userId,
        name: file.name,
        original_name: file.name,
        upload_date: new Date().toISOString(),
        parsing_status: file.parsingStatus,
        error_message: file.errorMessage || null,
        record_count: file.recordCount || 0,
        period_start: file.parsedData?.startDate?.toISOString() || null,
        period_end: file.parsedData?.endDate?.toISOString() || null,
        zone_number: file.zoneNumber || null,
        measurement_level: file.measurementLevel || null,
        file_order: file.order,
        object_type: saveData.objectType
      }));

      // Используем upsert для обновления существующих записей или создания новых
      const { error } = await this.supabase
        .from('uploaded_files')
        .upsert(filesToInsert, { onConflict: 'id' });

      if (error) {
        console.error('Ошибка сохранения файлов:', error);
        throw new Error(`Ошибка сохранения файлов: ${error.message}`);
      }

      console.log('Файлы успешно сохранены в базе данных');
    } catch (error) {
      console.error('Ошибка при сохранении файлов проекта:', error);
      throw error;
    }
  }

  // Получение файлов проекта
  async getProjectFiles(projectId: string, userId: string | null): Promise<UploadedFile[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    // Проверяем валидность userId
    if (!userId || !isValidUUID(userId)) {
      console.warn('Невалидный или отсутствующий userId, возвращаем пустой массив');
      return [];
    }

    try {
      console.log('Загружаем файлы проекта:', projectId);

      // Получаем файлы пользователя, которые могут быть связаны с проектом
      // Пока используем простую логику - файлы пользователя за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', userId)
        .gte('upload_date', thirtyDaysAgo.toISOString())
        .order('file_order', { ascending: true });

      if (error) {
        console.error('Ошибка получения файлов проекта:', error);
        throw new Error(`Ошибка получения файлов проекта: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('Файлы проекта не найдены');
        return [];
      }

      // Преобразуем данные из базы в формат UploadedFile
      const uploadedFiles: UploadedFile[] = data.map((dbFile: DatabaseUploadedFile) => ({
        id: dbFile.id,
        name: dbFile.name,
        uploadDate: new Date(dbFile.upload_date).toLocaleString('ru-RU'),
        parsingStatus: dbFile.parsing_status as any,
        errorMessage: dbFile.error_message || undefined,
        recordCount: dbFile.record_count || undefined,
        period: dbFile.period_start && dbFile.period_end ? 
          `${new Date(dbFile.period_start).toLocaleDateString('ru-RU')} - ${new Date(dbFile.period_end).toLocaleDateString('ru-RU')}` : 
          undefined,
        zoneNumber: dbFile.zone_number || undefined,
        measurementLevel: dbFile.measurement_level || undefined,
        order: dbFile.file_order
      }));

      console.log('Загружено файлов проекта:', uploadedFiles.length);
      return uploadedFiles;
    } catch (error) {
      console.error('Ошибка при получении файлов проекта:', error);
      throw error;
    }
  }

  // Удаление файла из базы данных
  async deleteFile(fileId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Ошибка удаления файла:', error);
        throw new Error(`Ошибка удаления файла: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
      throw error;
    }
  }

  // Обновление метаданных файла
  async updateFileMetadata(fileId: string, updates: {
    zoneNumber?: number;
    measurementLevel?: string;
    fileOrder?: number;
  }): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};
      
      if (updates.zoneNumber !== undefined) updateData.zone_number = updates.zoneNumber;
      if (updates.measurementLevel !== undefined) updateData.measurement_level = updates.measurementLevel;
      if (updates.fileOrder !== undefined) updateData.file_order = updates.fileOrder;

      const { error } = await this.supabase
        .from('uploaded_files')
        .update(updateData)
        .eq('id', fileId);

      if (error) {
        console.error('Ошибка обновления метаданных файла:', error);
        throw new Error(`Ошибка обновления метаданных файла: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при обновлении метаданных файла:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const uploadedFileService = new UploadedFileService();