import { createClient } from '@supabase/supabase-js';
import { 
  TestingPeriod, 
  TestingPeriodStatus,
  CreateTestingPeriodData, 
  UpdateTestingPeriodData 
} from '../types/TestingPeriod';

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
}

class TestingPeriodService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
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
        updatedAt: new Date(period.updated_at)
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
        updatedAt: new Date(period.updated_at)
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
          created_by: createdByValue
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
        updatedAt: new Date(data.updated_at)
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
}

// Экспорт синглтона сервиса
export const testingPeriodService = new TestingPeriodService();