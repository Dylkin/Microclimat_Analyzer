import { apiClient } from './apiClient';
import { 
  TestingPeriod, 
  TestingPeriodStatus,
  TestingPeriodDocument,
  CreateTestingPeriodData, 
  UpdateTestingPeriodData 
} from '../types/TestingPeriod';
import { sanitizeFileName } from './fileNameUtils';

class TestingPeriodService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Получение периодов испытаний для объекта квалификации
  async getTestingPeriodsByQualificationObject(qualificationObjectId: string): Promise<TestingPeriod[]> {
    try {
      const data = await apiClient.get<any[]>(`/testing-periods/by-object/${qualificationObjectId}`);
      return data.map(this.mapFromApi);
    } catch (error: any) {
      console.error('Ошибка получения периодов испытаний:', error);
      throw new Error(`Ошибка получения периодов испытаний: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  private mapFromApi(period: any): TestingPeriod {
    return {
      id: period.id,
      qualificationObjectId: period.qualificationObjectId || period.qualification_object_id,
      plannedStartDate: period.startDate ? new Date(period.startDate) : (period.start_date ? new Date(period.start_date) : new Date()),
      plannedEndDate: period.endDate ? new Date(period.endDate) : (period.end_date ? new Date(period.end_date) : new Date()),
      actualStartDate: period.actualStartDate ? new Date(period.actualStartDate) : (period.actual_start_date ? new Date(period.actual_start_date) : undefined),
      actualEndDate: period.actualEndDate ? new Date(period.actualEndDate) : (period.actual_end_date ? new Date(period.actual_end_date) : undefined),
      status: period.status || 'planned',
      notes: period.notes || undefined,
      createdBy: period.createdBy || period.created_by || undefined,
      createdByName: undefined,
      createdAt: period.createdAt ? new Date(period.createdAt) : (period.created_at ? new Date(period.created_at) : new Date()),
      updatedAt: period.updatedAt ? new Date(period.updatedAt) : (period.updated_at ? new Date(period.updated_at) : new Date()),
      testingStartDate: period.testingStartDate ? new Date(period.testingStartDate) : (period.testing_start_date ? new Date(period.testing_start_date) : undefined),
      testingEndDate: period.testingEndDate ? new Date(period.testingEndDate) : (period.testing_end_date ? new Date(period.testing_end_date) : undefined)
    };
  }

  // Получение периодов испытаний для проекта
  async getTestingPeriodsByProject(qualificationObjectIds: string[]): Promise<TestingPeriod[]> {
    try {
      // Получаем периоды для каждого объекта квалификации
      const allPeriods: TestingPeriod[] = [];
      for (const objectId of qualificationObjectIds) {
        const periods = await this.getTestingPeriodsByQualificationObject(objectId);
        allPeriods.push(...periods);
      }
      // Сортируем по дате начала
      return allPeriods.sort((a, b) => a.plannedStartDate.getTime() - b.plannedStartDate.getTime());
    } catch (error: any) {
      console.error('Ошибка получения периодов испытаний проекта:', error);
      throw new Error(`Ошибка получения периодов испытаний проекта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Добавление нового периода испытаний
  async addTestingPeriod(periodData: CreateTestingPeriodData, userId?: string | null): Promise<TestingPeriod> {
    try {
      console.log('Добавляем период испытаний:', periodData);
      
      const data = await apiClient.post<any>('/testing-periods', {
        qualificationObjectId: periodData.qualificationObjectId,
        startDate: periodData.plannedStartDate.toISOString(),
        endDate: periodData.plannedEndDate.toISOString(),
        status: periodData.status || 'planned',
        notes: periodData.notes || null
      });

      console.log('Период испытаний успешно добавлен:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка при добавлении периода испытаний:', error);
      throw new Error(`Ошибка добавления периода испытаний: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление периода испытаний
  async updateTestingPeriod(id: string, updates: UpdateTestingPeriodData): Promise<TestingPeriod> {
    try {
      const updateData: any = {};

      if (updates.plannedStartDate !== undefined) {
        updateData.startDate = updates.plannedStartDate.toISOString();
      }
      if (updates.plannedEndDate !== undefined) {
        updateData.endDate = updates.plannedEndDate.toISOString();
      }
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const data = await apiClient.put<any>(`/testing-periods/${id}`, updateData);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка при обновлении периода испытаний:', error);
      throw new Error(`Ошибка обновления периода испытаний: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление периода испытаний
  async deleteTestingPeriod(id: string): Promise<void> {
    try {
      await apiClient.delete(`/testing-periods/${id}`);
    } catch (error: any) {
      console.error('Ошибка при удалении периода испытаний:', error);
      throw new Error(`Ошибка удаления периода испытаний: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение статистики по периодам испытаний
  async getTestingPeriodsStats(qualificationObjectIds: string[]): Promise<{
    total: number;
    byStatus: Record<TestingPeriodStatus, number>;
  }> {
    try {
      const allPeriods: TestingPeriod[] = [];
      for (const objectId of qualificationObjectIds) {
        const periods = await this.getTestingPeriodsByQualificationObject(objectId);
        allPeriods.push(...periods);
      }

      const stats = {
        total: allPeriods.length,
        byStatus: {
          'planned': 0,
          'in_progress': 0,
          'completed': 0,
          'cancelled': 0
        } as Record<TestingPeriodStatus, number>
      };

      allPeriods.forEach((period) => {
        if (period.status) {
          stats.byStatus[period.status] = (stats.byStatus[period.status] || 0) + 1;
        }
      });

      return stats;
    } catch (error: any) {
      console.error('Ошибка при получении статистики периодов испытаний:', error);
      throw new Error(`Ошибка получения статистики: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Загрузка документа для периода испытаний
  async uploadTestingPeriodDocument(
    testingPeriodId: string, 
    file: File
  ): Promise<TestingPeriodDocument> {
    try {
      // Генерируем уникальное имя файла
      const sanitizedOriginalName = sanitizeFileName(file.name);
      const fileExt = sanitizedOriginalName.split('.').pop();
      const fileName = `testing-period-${testingPeriodId}-${Date.now()}.${fileExt}`;
      const filePath = `testing-period-documents/${fileName}`;

      console.log('Загружаем файл документа испытаний в Storage:', { fileName, filePath, fileSize: file.size });

      // Загружаем файл через API
      const uploadResult = await apiClient.uploadFile('/storage/upload', file, {
        bucket: 'documents',
        path: filePath
      });

      const publicUrl = uploadResult.data?.publicUrl || `/uploads/documents/${filePath}`;
      console.log('Получен публичный URL:', publicUrl);

      // Сохраняем информацию о документе через API (если есть endpoint)
      // Пока используем uploadedFiles API
      const docData = await apiClient.post<any>('/uploaded-files', {
        testingPeriodId: testingPeriodId,
        fileName: file.name,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type
      });

      console.log('Информация о документе сохранена в БД:', docData);

      return {
        id: docData.id,
        testingPeriodId: docData.testingPeriodId || docData.testing_period_id,
        fileName: docData.fileName || docData.file_name,
        fileUrl: publicUrl,
        fileSize: docData.fileSize || docData.file_size,
        mimeType: docData.mimeType || docData.mime_type,
        uploadedAt: docData.uploadedAt ? new Date(docData.uploadedAt) : (docData.uploaded_at ? new Date(docData.uploaded_at) : new Date()),
        createdAt: docData.createdAt ? new Date(docData.createdAt) : (docData.created_at ? new Date(docData.created_at) : new Date())
      };
    } catch (error: any) {
      console.error('Ошибка при загрузке документа испытаний:', error);
      throw new Error(`Ошибка загрузки документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение документов для периода испытаний
  async getTestingPeriodDocuments(testingPeriodId: string): Promise<TestingPeriodDocument[]> {
    try {
      const data = await apiClient.get<any[]>(`/uploaded-files?testing_period_id=${testingPeriodId}`);
      return data.map((doc: any) => ({
        id: doc.id,
        testingPeriodId: doc.testingPeriodId || doc.testing_period_id,
        fileName: doc.fileName || doc.file_name,
        fileUrl: doc.fileUrl || doc.file_url,
        fileSize: doc.fileSize || doc.file_size,
        mimeType: doc.mimeType || doc.mime_type,
        uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : (doc.uploaded_at ? new Date(doc.uploaded_at) : new Date()),
        createdAt: doc.createdAt ? new Date(doc.createdAt) : (doc.created_at ? new Date(doc.created_at) : new Date())
      }));
    } catch (error: any) {
      console.error('Ошибка при получении документов периода испытаний:', error);
      throw new Error(`Ошибка получения документов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление документа периода испытаний
  async deleteTestingPeriodDocument(documentId: string): Promise<void> {
    try {
      // Получаем информацию о документе
      const docData = await apiClient.get<any>(`/uploaded-files/${documentId}`);
      
      // Удаляем файл из Storage, если есть путь
      if (docData.filePath || docData.file_path) {
        const filePath = docData.filePath || docData.file_path;
        try {
          await apiClient.post('/storage/remove', {
            bucket: 'documents',
            paths: [filePath]
          });
        } catch (storageError) {
          console.warn('Ошибка удаления файла из Storage:', storageError);
          // Не прерываем выполнение
        }
      }

      // Удаляем запись из базы данных
      await apiClient.delete(`/uploaded-files/${documentId}`);
    } catch (error: any) {
      console.error('Ошибка при удалении документа периода испытаний:', error);
      throw new Error(`Ошибка удаления документа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

// Экспорт синглтона сервиса
export const testingPeriodService = new TestingPeriodService();