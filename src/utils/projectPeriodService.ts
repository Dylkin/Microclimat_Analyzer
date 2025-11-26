import { apiClient } from './apiClient';

export interface ProjectPeriod {
  projectId: string;
  earliestDate: string | null;
  latestDate: string | null;
  totalStages: number;
  completedStages: number;
}

class ProjectPeriodService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  async getProjectPeriod(projectId: string): Promise<ProjectPeriod | null> {
    try {
      // Получаем проект для получения contractor_id
      const project = await apiClient.get<any>(`/projects/${projectId}`);
      if (!project) {
        throw new Error('Проект не найден');
      }

      // Получаем все объекты квалификации для проекта
      const qualificationObjects = await apiClient.get<any[]>(`/qualification-objects?project_id=${projectId}`);

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
      const allSchedules: any[] = [];
      for (const objectId of objectIds) {
        try {
          const schedules = await apiClient.get<any[]>(`/qualification-work-schedule?qualification_object_id=${objectId}&project_id=${projectId}`);
          if (schedules) {
            allSchedules.push(...schedules);
          }
        } catch (error) {
          console.warn(`Ошибка загрузки расписания для объекта ${objectId}:`, error);
        }
      }

      if (allSchedules.length === 0) {
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

      allSchedules.forEach(schedule => {
        totalStages++;
        if (schedule.isCompleted || schedule.is_completed) {
          completedStages++;
        }

        const startDate = schedule.startDate || schedule.start_date;
        const endDate = schedule.endDate || schedule.end_date;

        // Проверяем дату начала
        if (startDate) {
          const startDateStr = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString().split('T')[0];
          if (!earliestDate || startDateStr < earliestDate) {
            earliestDate = startDateStr;
          }
          if (!latestDate || startDateStr > latestDate) {
            latestDate = startDateStr;
          }
        }

        // Проверяем дату окончания
        if (endDate) {
          const endDateStr = typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0];
          if (!earliestDate || endDateStr < earliestDate) {
            earliestDate = endDateStr;
          }
          if (!latestDate || endDateStr > latestDate) {
            latestDate = endDateStr;
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
    } catch (error: any) {
      console.error('Ошибка получения периода проекта:', error);
      throw new Error(`Ошибка получения периода проекта: ${error.message || 'Неизвестная ошибка'}`);
    }
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
