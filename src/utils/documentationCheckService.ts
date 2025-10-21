import { supabase } from './supabaseClient';
import { DocumentationCheck, DocumentationItem } from '../types/DocumentationCheck';

export interface CreateDocumentationCheckData {
  qualificationObjectId: string;
  projectId: string;
  items: DocumentationItem[];
  checkedBy: string;
  checkedByName: string;
}

class DocumentationCheckService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Сохранение проверки документации
  async saveCheck(checkData: CreateDocumentationCheckData): Promise<DocumentationCheck> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('DocumentationCheckService: Сохраняем проверку документации:', checkData);

      const { data, error } = await this.supabase
        .from('documentation_checks')
        .insert({
          qualification_object_id: checkData.qualificationObjectId,
          project_id: checkData.projectId,
          items: checkData.items,
          checked_by: checkData.checkedBy,
          checked_by_name: checkData.checkedByName,
          checked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('DocumentationCheckService: Ошибка сохранения проверки:', error);
        throw new Error(`Ошибка сохранения проверки документации: ${error.message}`);
      }

      console.log('DocumentationCheckService: Проверка документации успешно сохранена:', data);
      return this.mapFromDatabase(data);
    } catch (error) {
      console.error('DocumentationCheckService: Ошибка в saveCheck:', error);
      throw error;
    }
  }

  // Получение последней проверки документации для объекта и проекта
  async getLatestCheck(qualificationObjectId: string, projectId: string): Promise<DocumentationCheck | null> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('DocumentationCheckService: Загружаем последнюю проверку документации:', {
        qualificationObjectId,
        projectId
      });

      const { data, error } = await this.supabase
        .from('documentation_checks')
        .select('*')
        .eq('qualification_object_id', qualificationObjectId)
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Запись не найдена
          console.log('DocumentationCheckService: Проверка документации не найдена');
          return null;
        }
        console.error('DocumentationCheckService: Ошибка загрузки проверки:', error);
        throw new Error(`Ошибка загрузки проверки документации: ${error.message}`);
      }

      console.log('DocumentationCheckService: Проверка документации загружена:', data);
      return this.mapFromDatabase(data);
    } catch (error) {
      console.error('DocumentationCheckService: Ошибка в getLatestCheck:', error);
      throw error;
    }
  }

  // Обновление проверки документации
  async updateCheck(checkId: string, updateData: Partial<CreateDocumentationCheckData>): Promise<DocumentationCheck> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('DocumentationCheckService: Обновляем проверку документации:', checkId, updateData);

      const updateFields: any = {
        updated_at: new Date().toISOString()
      };

      if (updateData.items) updateFields.items = updateData.items;
      if (updateData.checkedBy) updateFields.checked_by = updateData.checkedBy;
      if (updateData.checkedByName) updateFields.checked_by_name = updateData.checkedByName;

      const { data, error } = await this.supabase
        .from('documentation_checks')
        .update(updateFields)
        .eq('id', checkId)
        .select()
        .single();

      if (error) {
        console.error('DocumentationCheckService: Ошибка обновления проверки:', error);
        throw new Error(`Ошибка обновления проверки документации: ${error.message}`);
      }

      console.log('DocumentationCheckService: Проверка документации успешно обновлена:', data);
      return this.mapFromDatabase(data);
    } catch (error) {
      console.error('DocumentationCheckService: Ошибка в updateCheck:', error);
      throw error;
    }
  }

  // Преобразование данных из базы в формат приложения
  private mapFromDatabase(data: any): DocumentationCheck {
    return {
      id: data.id,
      qualificationObjectId: data.qualification_object_id,
      projectId: data.project_id,
      items: data.items || [],
      checkedAt: new Date(data.checked_at),
      checkedBy: data.checked_by,
      checkedByName: data.checked_by_name
    };
  }

  // Метод для получения всех проверок документации (для администрирования)
  async getAllChecks(limit: number = 50, offset: number = 0): Promise<DocumentationCheck[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('DocumentationCheckService: Загружаем все проверки документации:', { limit, offset });

      const { data, error } = await this.supabase
        .from('documentation_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('DocumentationCheckService: Ошибка загрузки всех проверок:', error);
        throw new Error(`Ошибка загрузки проверок документации: ${error.message}`);
      }

      console.log('DocumentationCheckService: Загружено проверок:', data?.length || 0);
      return data?.map((item: any) => this.mapFromDatabase(item)) || [];
    } catch (error) {
      console.error('DocumentationCheckService: Ошибка в getAllChecks:', error);
      throw error;
    }
  }
}

export const documentationCheckService = new DocumentationCheckService();
