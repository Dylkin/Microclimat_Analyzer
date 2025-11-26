import { apiClient } from './apiClient';
import { UploadedFile } from '../types/FileData';
import { QualificationObjectType } from '../types/QualificationObject';

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface SaveFileData {
  projectId: string;
  qualificationObjectId: string;
  objectType: QualificationObjectType;
  files: UploadedFile[];
}

class UploadedFileService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Сохранение файлов в связке с проектом
  async saveProjectFiles(saveData: SaveFileData, userId: string | null): Promise<void> {
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

      await apiClient.post('/uploaded-files', { files: filesToInsert });
      console.log('Файлы успешно сохранены в базе данных');
    } catch (error: any) {
      console.error('Ошибка при сохранении файлов проекта:', error);
      throw new Error(`Ошибка сохранения файлов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение файлов проекта
  async getProjectFiles(projectId: string, userId: string | null): Promise<UploadedFile[]> {
    // Проверяем валидность userId
    if (!userId || !isValidUUID(userId)) {
      console.warn('Невалидный или отсутствующий userId, возвращаем пустой массив');
      return [];
    }

    try {
      console.log('Загружаем файлы проекта:', projectId);

      const params = new URLSearchParams();
      params.append('user_id', userId);
      if (projectId) params.append('project_id', projectId);

      const data = await apiClient.get<any[]>(`/uploaded-files?${params.toString()}`);

      if (!data || data.length === 0) {
        console.log('Файлы проекта не найдены');
        return [];
      }

      // Преобразуем данные из базы в формат UploadedFile
      const uploadedFiles: UploadedFile[] = data.map((dbFile: any) => ({
        id: dbFile.id,
        name: dbFile.name || dbFile.original_name,
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
    } catch (error: any) {
      console.error('Ошибка при получении файлов проекта:', error);
      throw new Error(`Ошибка получения файлов проекта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление файла из базы данных
  async deleteFile(fileId: string): Promise<void> {
    try {
      await apiClient.delete(`/uploaded-files/${fileId}`);
    } catch (error: any) {
      console.error('Ошибка при удалении файла:', error);
      throw new Error(`Ошибка удаления файла: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление метаданных файла
  async updateFileMetadata(fileId: string, updates: {
    zoneNumber?: number;
    measurementLevel?: string;
    fileOrder?: number;
  }): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.zoneNumber !== undefined) updateData.zoneNumber = updates.zoneNumber;
      if (updates.measurementLevel !== undefined) updateData.measurementLevel = updates.measurementLevel;
      if (updates.fileOrder !== undefined) updateData.fileOrder = updates.fileOrder;

      await apiClient.patch(`/uploaded-files/${fileId}`, updateData);
    } catch (error: any) {
      console.error('Ошибка при обновлении метаданных файла:', error);
      throw new Error(`Ошибка обновления метаданных файла: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

// Экспорт синглтона сервиса
export const uploadedFileService = new UploadedFileService();