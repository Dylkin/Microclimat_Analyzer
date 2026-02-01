import { apiClient } from './apiClient';
import { DocumentationCheck, DocumentationItem } from '../types/DocumentationCheck';

export interface CreateDocumentationCheckData {
  qualificationObjectId: string;
  projectId: string;
  items: DocumentationItem[];
  checkedBy: string;
  checkedByName: string;
}

class DocumentationCheckService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  // Сохранение проверки документации
  async saveCheck(checkData: CreateDocumentationCheckData): Promise<DocumentationCheck> {
    try {
      console.log('DocumentationCheckService: Сохраняем проверку документации:', checkData);

      const data = await apiClient.post<any>('/documentation-checks', {
        qualificationObjectId: checkData.qualificationObjectId,
        projectId: checkData.projectId,
        items: checkData.items,
        checkedBy: checkData.checkedBy,
        checkedByName: checkData.checkedByName
      });

      console.log('DocumentationCheckService: Проверка документации успешно сохранена:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('DocumentationCheckService: Ошибка в saveCheck:', error);
      throw new Error(`Ошибка сохранения проверки документации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение последней проверки документации для объекта и проекта
  async getLatestCheck(qualificationObjectId: string, projectId: string): Promise<DocumentationCheck | null> {
    try {
      console.log('DocumentationCheckService: Загружаем последнюю проверку документации:', {
        qualificationObjectId,
        projectId
      });

      try {
        const params = new URLSearchParams();
        params.append('qualification_object_id', qualificationObjectId);
        params.append('project_id', projectId);
        const data = await apiClient.get<any>(`/documentation-checks/latest?${params.toString()}`);

        console.log('DocumentationCheckService: Проверка документации загружена:', data);
        return this.mapFromApi(data);
      } catch (error: any) {
        // Обрабатываем 404 как нормальную ситуацию (проверка еще не создана)
        if (error.status === 404 || error.message?.includes('404') || error.message?.includes('не найдена')) {
          console.log('DocumentationCheckService: Проверка документации не найдена (это нормально для новых объектов)');
          return null;
        }
        throw error;
      }
    } catch (error: any) {
      console.error('DocumentationCheckService: Ошибка в getLatestCheck:', error);
      throw new Error(`Ошибка загрузки проверки документации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление проверки документации
  async updateCheck(checkId: string, updateData: Partial<CreateDocumentationCheckData>): Promise<DocumentationCheck> {
    try {
      console.log('DocumentationCheckService: Обновляем проверку документации:', checkId, updateData);

      const updates: any = {};
      if (updateData.items) updates.items = updateData.items;
      if (updateData.checkedBy) updates.checkedBy = updateData.checkedBy;
      if (updateData.checkedByName) updates.checkedByName = updateData.checkedByName;

      const data = await apiClient.put<any>(`/documentation-checks/${checkId}`, updates);

      console.log('DocumentationCheckService: Проверка документации успешно обновлена:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('DocumentationCheckService: Ошибка в updateCheck:', error);
      throw new Error(`Ошибка обновления проверки документации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Преобразование данных из API в формат приложения
  private mapFromApi(data: any): DocumentationCheck {
    return {
      id: data.id,
      qualificationObjectId: data.qualificationObjectId || data.qualification_object_id,
      projectId: data.projectId || data.project_id,
      items: data.items || [],
      checkedAt: data.checkedAt ? new Date(data.checkedAt) : (data.checked_at ? new Date(data.checked_at) : new Date()),
      checkedBy: data.checkedBy || data.checked_by,
      checkedByName: data.checkedByName || data.checked_by_name
    };
  }

  // Метод для получения всех проверок документации (для администрирования)
  async getAllChecks(limit: number = 50, offset: number = 0): Promise<DocumentationCheck[]> {
    try {
      console.log('DocumentationCheckService: Загружаем все проверки документации:', { limit, offset });

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const data = await apiClient.get<any[]>(`/documentation-checks?${params.toString()}`);

      console.log('DocumentationCheckService: Загружено проверок:', data?.length || 0);
      return data?.map((item: any) => this.mapFromApi(item)) || [];
    } catch (error: any) {
      console.error('DocumentationCheckService: Ошибка в getAllChecks:', error);
      throw new Error(`Ошибка загрузки проверок документации: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const documentationCheckService = new DocumentationCheckService();
