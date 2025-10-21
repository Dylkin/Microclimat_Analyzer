import { supabase } from './supabaseClient';

export interface ProjectPeriod {
  projectId: string;
  earliestDate: string | null;
  latestDate: string | null;
  totalStages: number;
  completedStages: number;
}

class ProjectPeriodService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return !!this.supabase;
  }

  async getProjectPeriod(projectId: string): Promise<ProjectPeriod | null> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем все объекты квалификации для проекта
      const { data: qualificationObjects, error: objectsError } = await this.supabase!
        .from('qualification_objects')
        .select('id')
        .eq('contractor_id', (await this.getContractorIdByProject(projectId)));

      if (objectsError) {
        throw new Error(`Ошибка загрузки объектов квалификации: ${objectsError.message}`);
      }

      if (!qualificationObjects || qualificationObjects.length === 0) {
        return {
          projectId,
          earliestDate: null,
          latestDate: null,
          totalStages: 0,
          completedStages: 0
        };
      }

      const objectIds = qualificationObjects.map(obj => obj.id);

      // Получаем все расписания для объектов квалификации
      const { data: schedules, error: schedulesError } = await this.supabase!
        .from('qualification_work_schedule')
        .select('start_date, end_date, is_completed')
        .in('qualification_object_id', objectIds);

      if (schedulesError) {
        throw new Error(`Ошибка загрузки расписаний: ${schedulesError.message}`);
      }

      if (!schedules || schedules.length === 0) {
        return {
          projectId,
          earliestDate: null,
          latestDate: null,
          totalStages: 0,
          completedStages: 0
        };
      }

      // Находим самую раннюю и самую позднюю даты
      let earliestDate: string | null = null;
      let latestDate: string | null = null;
      let totalStages = 0;
      let completedStages = 0;

      schedules.forEach(schedule => {
        totalStages++;
        if (schedule.is_completed) {
          completedStages++;
        }

        // Проверяем дату начала
        if (schedule.start_date) {
          if (!earliestDate || schedule.start_date < earliestDate) {
            earliestDate = schedule.start_date;
          }
          if (!latestDate || schedule.start_date > latestDate) {
            latestDate = schedule.start_date;
          }
        }

        // Проверяем дату окончания
        if (schedule.end_date) {
          if (!earliestDate || schedule.end_date < earliestDate) {
            earliestDate = schedule.end_date;
          }
          if (!latestDate || schedule.end_date > latestDate) {
            latestDate = schedule.end_date;
          }
        }
      });

      return {
        projectId,
        earliestDate,
        latestDate,
        totalStages,
        completedStages
      };
    } catch (error) {
      console.error('Ошибка получения периода проекта:', error);
      throw error;
    }
  }

  private async getContractorIdByProject(projectId: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data: project, error } = await this.supabase!
      .from('projects')
      .select('contractor_id')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(`Ошибка загрузки проекта: ${error.message}`);
    }

    if (!project) {
      throw new Error('Проект не найден');
    }

    return project.contractor_id;
  }

  formatPeriod(period: ProjectPeriod): string {
    if (!period.earliestDate && !period.latestDate) {
      return 'Период не установлен';
    }

    if (period.earliestDate && period.latestDate) {
      const startDate = new Date(period.earliestDate).toLocaleDateString('ru-RU');
      const endDate = new Date(period.latestDate).toLocaleDateString('ru-RU');
      
      if (period.earliestDate === period.latestDate) {
        return startDate;
      } else {
        return `${startDate} - ${endDate}`;
      }
    }

    if (period.earliestDate) {
      return `с ${new Date(period.earliestDate).toLocaleDateString('ru-RU')}`;
    }

    if (period.latestDate) {
      return `до ${new Date(period.latestDate).toLocaleDateString('ru-RU')}`;
    }

    return 'Период не установлен';
  }
}

export const projectPeriodService = new ProjectPeriodService();
