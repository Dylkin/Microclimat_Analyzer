import { supabase } from './supabaseClient';
import { 
  TestingPeriod, 
  TestingPeriodStatus,
  TestingPeriodDocument,
  CreateTestingPeriodData, 
  UpdateTestingPeriodData 
} from '../types/TestingPeriod';
import { sanitizeFileName } from './fileNameUtils';

interface DatabaseTestingPeriod {
  id: string;
  qualification_object_id: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: TestingPeriodStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  testing_start_date: string | null;
  testing_end_date: string | null;
}

interface DatabaseTestingPeriodDocument {
  id: string;
  testing_period_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  created_at: string;
}

class TestingPeriodService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение периодов испытаний для объекта квалификации
  async getTestingPeriodsByQualificationObject(qualificationObjectId: string): Promise<TestingPeriod[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_object_testing_periods')
        .select('*')
        .eq('qualification_object_id', qualificationObjectId)
        .order('planned_start_date', { ascending: true });

      if (error) {
        console.error('Ошибка получения периодов испытаний:', error);
        throw new Error(`Ошибка получения периодов испытаний: ${error.message}`);
      }

      return data.map((period: any) => ({
        id: period.id,
        qualificationObjectId: period.qualification_object_id,
        plannedStartDate: new Date(period.planned_start_date),
        plannedEndDate: new Date(period.planned_end_date),
        actualStartDate: period.actual_start_date ? new Date(period.actual_start_date) : undefined,
        actualEndDate: period.actual_end_date ? new Date(period.actual_end_date) : undefined,
        status: period.status,
        notes: period.notes || undefined,
        createdBy: period.created_by || undefined,
        createdByName: undefined, // Will be populated separately if needed
        createdAt: new Date(period.created_at),
        updatedAt: new Date(period.updated_at),
        testingStartDate: period.testing_start_date ? new Date(period.testing_start_date) : undefined,
        testingEndDate: period.testing_end_date ? new Date(period.testing_end_date) : undefined
      }));
    } catch (error) {
      console.error('Ошибка при получении периодов испытаний:', error);
      throw error;
    }
  }

  // Получение периодов испытаний для проекта
  async getTestingPeriodsByProject(qualificationObjectIds: string[]): Promise<TestingPeriod[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_object_testing_periods')
        .select('*')
        .in('qualification_object_id', qualificationObjectIds)
        .order('planned_start_date', { ascending: true });

      if (error) {
        console.error('Ошибка получения периодов испытаний проекта:', error);
        throw new Error(`Ошибка получения периодов испытаний проекта: ${error.message}`);
      }

      return data.map((period: any) => ({
        id: period.id,
        qualificationObjectId: period.qualification_object_id,
        plannedStartDate: new Date(period.planned_start_date),
        plannedEndDate: new Date(period.planned_end_date),
        actualStartDate: period.actual_start_date ? new Date(period.actual_start_date) : undefined,
        actualEndDate: period.actual_end_date ? new Date(period.actual_end_date) : undefined,
        status: period.status,
        notes: period.notes || undefined,
        createdBy: period.created_by || undefined,
        createdByName: undefined, // Will be populated separately if needed
        createdAt: new Date(period.created_at),
        updatedAt: new Date(period.updated_at),
        testingStartDate: period.testing_start_date ? new Date(period.testing_start_date) : undefined,
        testingEndDate: period.testing_end_date ? new Date(period.testing_end_date) : undefined
      }));
    } catch (error) {
      console.error('Ошибка при получении периодов испытаний проекта:', error);
      throw error;
    }
  }

  // Добавление нового периода испытаний
  async addTestingPeriod(periodData: CreateTestingPeriodData, userId?: string | null): Promise<TestingPeriod> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем период испытаний:', periodData);
      
      // Если userId не передан или это локальный пользователь, устанавливаем null
      let createdByValue = null;
      if (userId && userId.length === 36 && userId.includes('-')) {
        // Проверяем, существует ли пользователь в базе данных
        const { data: userExists } = await this.supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (userExists) {
          createdByValue = userId;
        }
      }

      const { data, error } = await this.supabase
        .from('qualification_object_testing_periods')
        .insert({
          qualification_object_id: periodData.qualificationObjectId,
          planned_start_date: periodData.plannedStartDate.toISOString().split('T')[0],
          planned_end_date: periodData.plannedEndDate.toISOString().split('T')[0],
          actual_start_date: periodData.actualStartDate?.toISOString().split('T')[0] || null,
          actual_end_date: periodData.actualEndDate?.toISOString().split('T')[0] || null,
          status: periodData.status || 'planned',
          notes: periodData.notes || null,
          created_by: createdByValue,
          testing_start_date: periodData.testingStartDate?.toISOString().split('T')[0] || null,
          testing_end_date: periodData.testingEndDate?.toISOString().split('T')[0] || null
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка добавления периода испытаний:', error);
        throw new Error(`Ошибка добавления периода испытаний: ${error.message}`);
      }

      console.log('Период испытаний успешно добавлен:', data);

      return {
        id: data.id,
        qualificationObjectId: data.qualification_object_id,
        plannedStartDate: new Date(data.planned_start_date),
        plannedEndDate: new Date(data.planned_end_date),
        actualStartDate: data.actual_start_date ? new Date(data.actual_start_date) : undefined,
        actualEndDate: data.actual_end_date ? new Date(data.actual_end_date) : undefined,
        status: data.status,
        notes: data.notes || undefined,
        createdBy: data.created_by || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении периода испытаний:', error);
      throw error;
    }
  }

  // Обновление периода испытаний
  async updateTestingPeriod(id: string, updates: UpdateTestingPeriodData): Promise<TestingPeriod> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};

      if (updates.plannedStartDate !== undefined) {
        updateData.planned_start_date = updates.plannedStartDate.toISOString().split('T')[0];
      }
      if (updates.plannedEndDate !== undefined) {
        updateData.planned_end_date = updates.plannedEndDate.toISOString().split('T')[0];
      }
      if (updates.actualStartDate !== undefined) {
        updateData.actual_start_date = updates.actualStartDate?.toISOString().split('T')[0] || null;
      }
      if (updates.actualEndDate !== undefined) {
        updateData.actual_end_date = updates.actualEndDate?.toISOString().split('T')[0] || null;
      }
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.testingStartDate !== undefined) {
        updateData.testing_start_date = updates.testingStartDate?.toISOString().split('T')[0] || null;
      }
      if (updates.testingEndDate !== undefined) {
        updateData.testing_end_date = updates.testingEndDate?.toISOString().split('T')[0] || null;
      }

      const { data, error } = await this.supabase
        .from('qualification_object_testing_periods')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления периода испытаний:', error);
        throw new Error(`Ошибка обновления периода испытаний: ${error.message}`);
      }

      return {
        id: data.id,
        qualificationObjectId: data.qualification_object_id,
        plannedStartDate: new Date(data.planned_start_date),
        plannedEndDate: new Date(data.planned_end_date),
        actualStartDate: data.actual_start_date ? new Date(data.actual_start_date) : undefined,
        actualEndDate: data.actual_end_date ? new Date(data.actual_end_date) : undefined,
        status: data.status,
        notes: data.notes || undefined,
        createdBy: data.created_by || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        testingStartDate: data.testing_start_date ? new Date(data.testing_start_date) : undefined,
        testingEndDate: data.testing_end_date ? new Date(data.testing_end_date) : undefined
      };
    } catch (error) {
      console.error('Ошибка при обновлении периода испытаний:', error);
      throw error;
    }
  }

  // Удаление периода испытаний
  async deleteTestingPeriod(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('qualification_object_testing_periods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления периода испытаний:', error);
        throw new Error(`Ошибка удаления периода испытаний: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении периода испытаний:', error);
      throw error;
    }
  }

  // Получение статистики по периодам испытаний
  async getTestingPeriodsStats(qualificationObjectIds: string[]): Promise<{
    total: number;
    byStatus: Record<TestingPeriodStatus, number>;
  }> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('qualification_object_testing_periods')
        .select('status')
        .in('qualification_object_id', qualificationObjectIds);

      if (error) {
        console.error('Ошибка получения статистики периодов испытаний:', error);
        throw new Error(`Ошибка получения статистики: ${error.message}`);
      }

      const stats = {
        total: data.length,
        byStatus: {
          'planned': 0,
          'in_progress': 0,
          'completed': 0,
          'cancelled': 0
        } as Record<TestingPeriodStatus, number>
      };

      data.forEach((item: { status: TestingPeriodStatus }) => {
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Ошибка при получении статистики периодов испытаний:', error);
      throw error;
    }
  }

  // Загрузка документа для периода испытаний
  async uploadTestingPeriodDocument(
    testingPeriodId: string, 
    file: File
  ): Promise<TestingPeriodDocument> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Генерируем уникальное имя файла
      const sanitizedOriginalName = sanitizeFileName(file.name);
      const fileExt = sanitizedOriginalName.split('.').pop();
      const fileName = `testing-period-${testingPeriodId}-${Date.now()}.${fileExt}`;
      const filePath = `testing-period-documents/${fileName}`;

      console.log('Загружаем файл документа испытаний в Storage:', { fileName, filePath, fileSize: file.size });

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Ошибка загрузки файла в Storage:', uploadError);
        throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
      }

      console.log('Файл успешно загружен в Storage:', uploadData);

      // Получаем публичный URL файла
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Не удалось получить публичный URL файла');
      }

      console.log('Получен публичный URL:', urlData.publicUrl);

      // Сохраняем информацию о документе в базе данных
      const { data: docData, error: docError } = await this.supabase
        .from('testing_period_documents')
        .insert({
          testing_period_id: testingPeriodId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type
        })
        .select()
        .single();

      if (docError) {
        console.error('Ошибка сохранения информации о документе:', docError);
        throw new Error(`Ошибка сохранения документа: ${docError.message}`);
      }

      console.log('Информация о документе сохранена в БД:', docData);

      return {
        id: docData.id,
        testingPeriodId: docData.testing_period_id,
        fileName: docData.file_name,
        fileUrl: docData.file_url,
        fileSize: docData.file_size,
        mimeType: docData.mime_type,
        uploadedAt: new Date(docData.uploaded_at),
        createdAt: new Date(docData.created_at)
      };
    } catch (error) {
      console.error('Ошибка при загрузке документа испытаний:', error);
      throw error;
    }
  }

  // Получение документов для периода испытаний
  async getTestingPeriodDocuments(testingPeriodId: string): Promise<TestingPeriodDocument[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('testing_period_documents')
        .select('*')
        .eq('testing_period_id', testingPeriodId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения документов периода испытаний:', error);
        throw new Error(`Ошибка получения документов: ${error.message}`);
      }

      return data.map((doc: DatabaseTestingPeriodDocument) => ({
        id: doc.id,
        testingPeriodId: doc.testing_period_id,
        fileName: doc.file_name,
        fileUrl: doc.file_url,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedAt: new Date(doc.uploaded_at),
        createdAt: new Date(doc.created_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении документов периода испытаний:', error);
      throw error;
    }
  }

  // Удаление документа периода испытаний
  async deleteTestingPeriodDocument(documentId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Сначала получаем информацию о документе для удаления файла из Storage
      const { data: docData, error: getError } = await this.supabase
        .from('testing_period_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (getError) {
        console.error('Ошибка получения информации о документе:', getError);
        throw new Error(`Ошибка получения документа: ${getError.message}`);
      }

      // Извлекаем путь файла из URL
      const urlParts = docData.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Получаем последние 2 части пути
      
      if (filePath) {
        // Удаляем файл из Storage
        const { error: storageError } = await this.supabase.storage
          .from('documents')
          .remove([filePath]);

        if (storageError) {
          console.warn('Ошибка удаления файла из Storage:', storageError);
          // Не прерываем выполнение, так как запись в БД все равно нужно удалить
        }
      }

      // Удаляем запись из базы данных
      const { error: deleteError } = await this.supabase
        .from('testing_period_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Ошибка удаления документа из БД:', deleteError);
        throw new Error(`Ошибка удаления документа: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении документа периода испытаний:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const testingPeriodService = new TestingPeriodService();