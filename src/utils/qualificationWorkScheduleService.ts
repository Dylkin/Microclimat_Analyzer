import { apiClient } from './apiClient';
import { qualificationObjectService } from './qualificationObjectService';

export interface QualificationWorkStage {
  id: string;
  qualificationObjectId: string;
  projectId?: string; // Добавляем привязку к проекту
  stageName: string;
  stageDescription: string;
  startDate?: string;
  endDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

class QualificationWorkScheduleService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  private mapFromApi(data: any): QualificationWorkStage {
    return {
      id: data.id,
      qualificationObjectId: data.qualificationObjectId || data.qualification_object_id,
      projectId: data.projectId || data.project_id,
      stageName: data.stageName || data.stage_name,
      stageDescription: data.stageDescription || data.stage_description,
      startDate: data.startDate || data.start_date,
      endDate: data.endDate || data.end_date,
      isCompleted: data.isCompleted || data.is_completed || false,
      completedAt: data.completedAt || data.completed_at,
      completedBy: data.completedBy || data.completed_by,
      cancelledAt: data.cancelledAt || data.cancelled_at,
      cancelledBy: data.cancelledBy || data.cancelled_by,
      createdAt: data.createdAt ? new Date(data.createdAt) : (data.created_at ? new Date(data.created_at) : new Date()),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : (data.updated_at ? new Date(data.updated_at) : new Date())
    };
  }

  async getWorkSchedule(qualificationObjectId: string, projectId?: string): Promise<QualificationWorkStage[]> {
    try {
      let url = `/qualification-work-schedule?qualification_object_id=${qualificationObjectId}`;
      if (projectId) {
        url += `&project_id=${projectId}`;
      }

      const data = await apiClient.get<any[]>(url);
      if (!data) {
        return [];
      }

      console.log('QualificationWorkScheduleService: Сырые данные из БД:', data);
      const mappedData = data.map(this.mapFromApi);
      console.log('QualificationWorkScheduleService: Преобразованные данные:', mappedData);
      
      // Проверяем, есть ли этап "Расстановка логгеров" и создаем зону "Внешний датчик" если нужно
      const hasLoggerPlacementStage = mappedData.some(stage => stage.stageName === 'Расстановка логгеров');
      if (hasLoggerPlacementStage) {
        console.log('QualificationWorkScheduleService: Найден этап "Расстановка логгеров", проверяем зону "Внешний датчик"');
        try {
          await this.createExternalSensorZone(qualificationObjectId);
        } catch (error) {
          console.error('QualificationWorkScheduleService: Ошибка при создании зоны "Внешний датчик":', error);
          // Не прерываем выполнение из-за ошибки создания зоны
        }
      }
      
      return mappedData;
    } catch (error: any) {
      console.error('Ошибка загрузки расписания:', error);
      throw new Error(`Ошибка загрузки расписания: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async saveWorkSchedule(qualificationObjectId: string, stages: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>[], projectId?: string): Promise<QualificationWorkStage[]> {
    try {
      const data = await apiClient.post<any[]>('/qualification-work-schedule', {
        qualificationObjectId,
        projectId,
        stages: stages.map(stage => ({
          stageName: stage.stageName,
          stageDescription: stage.stageDescription,
          startDate: stage.startDate,
          endDate: stage.endDate,
          isCompleted: stage.isCompleted,
          completedAt: stage.completedAt,
          completedBy: stage.completedBy,
          cancelledAt: stage.cancelledAt,
          cancelledBy: stage.cancelledBy
        }))
      });

      if (!data) {
        return [];
      }

      return data.map(this.mapFromApi);
    } catch (error: any) {
      console.error('Ошибка сохранения расписания:', error);
      throw new Error(`Ошибка сохранения расписания: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async deleteWorkSchedule(qualificationObjectId: string): Promise<void> {
    try {
      // Получаем все записи для удаления
      const schedules = await this.getWorkSchedule(qualificationObjectId);
      // Удаляем через сохранение пустого массива
      await this.saveWorkSchedule(qualificationObjectId, []);
    } catch (error: any) {
      throw new Error(`Ошибка удаления расписания: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async createWorkStage(qualificationObjectId: string, stageData: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>): Promise<QualificationWorkStage> {
    try {
      // Получаем текущее расписание
      const currentSchedule = await this.getWorkSchedule(qualificationObjectId);
      // Добавляем новый этап
      const newStages = [...currentSchedule.map(s => ({
        stageName: s.stageName,
        stageDescription: s.stageDescription,
        startDate: s.startDate,
        endDate: s.endDate,
        isCompleted: s.isCompleted,
        completedAt: s.completedAt,
        completedBy: s.completedBy,
        cancelledAt: s.cancelledAt,
        cancelledBy: s.cancelledBy
      })), stageData];
      
      // Сохраняем обновленное расписание
      const saved = await this.saveWorkSchedule(qualificationObjectId, newStages);
      const createdStage = saved.find(s => s.stageName === stageData.stageName && !s.id);
      
      if (!createdStage) {
        throw new Error('Не удалось создать этап');
      }
      
      // Если создан этап "Расстановка логгеров", автоматически создаем зону "Внешний датчик"
      if (stageData.stageName === 'Расстановка логгеров') {
        console.log('QualificationWorkScheduleService: Создан этап "Расстановка логгеров", создаем зону "Внешний датчик"');
        await this.createExternalSensorZone(qualificationObjectId);
      }

      return createdStage;
    } catch (error: any) {
      throw new Error(`Ошибка создания этапа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  async updateWorkStage(qualificationObjectId: string, stageId: string, stageData: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>, projectId?: string): Promise<QualificationWorkStage> {
    try {
      console.log('QualificationWorkScheduleService: updateWorkStage вызван', {
        qualificationObjectId,
        stageId,
        stageData,
        projectId
      });
      
      // Получаем текущее расписание с учетом projectId
      const currentSchedule = await this.getWorkSchedule(qualificationObjectId, projectId);
      console.log('QualificationWorkScheduleService: Текущее расписание:', currentSchedule);
      
      // Находим этап по ID или по имени (на случай, если ID изменился после пересоздания)
      const stageToUpdate = currentSchedule.find(s => s.id === stageId || s.stageName === stageData.stageName);
      
      if (!stageToUpdate) {
        console.error('QualificationWorkScheduleService: Этап не найден', { stageId, stageName: stageData.stageName, currentSchedule });
        throw new Error(`Этап не найден: ${stageData.stageName}`);
      }
      
      console.log('QualificationWorkScheduleService: Найден этап для обновления:', stageToUpdate);
      
      // Обновляем нужный этап
      const updatedStages = currentSchedule.map(s => 
        (s.id === stageId || s.stageName === stageData.stageName)
          ? { ...s, ...stageData }
          : s
      );
      
      console.log('QualificationWorkScheduleService: Обновленные этапы перед сохранением:', updatedStages);
      
      // Сохраняем обновленное расписание с учетом projectId
      const saved = await this.saveWorkSchedule(
        qualificationObjectId, 
        updatedStages.map(s => ({
          stageName: s.stageName,
          stageDescription: s.stageDescription,
          startDate: s.startDate,
          endDate: s.endDate,
          isCompleted: s.isCompleted,
          completedAt: s.completedAt,
          completedBy: s.completedBy,
          cancelledAt: s.cancelledAt,
          cancelledBy: s.cancelledBy
        })),
        projectId
      );
      
      console.log('QualificationWorkScheduleService: Сохраненные этапы:', saved);
      
      // Ищем обновленный этап по имени (так как ID могут измениться после пересоздания)
      const updated = saved.find(s => s.stageName === stageData.stageName);
      if (!updated) {
        console.error('QualificationWorkScheduleService: Обновленный этап не найден после сохранения', {
          stageName: stageData.stageName,
          savedStages: saved.map(s => ({ id: s.id, name: s.stageName }))
        });
        throw new Error(`Не удалось найти обновленный этап: ${stageData.stageName}`);
      }
      
      console.log('QualificationWorkScheduleService: Этап успешно обновлен:', updated);
      return updated;
    } catch (error: any) {
      console.error('QualificationWorkScheduleService: updateWorkStage - ошибка:', error);
      throw new Error(`Ошибка обновления этапа: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Создание зоны измерения "Внешний датчик" для объекта квалификации
   */
  private async createExternalSensorZone(qualificationObjectId: string): Promise<void> {
    try {
      console.log('QualificationWorkScheduleService: Создание зоны измерения "Внешний датчик" для объекта:', qualificationObjectId);
      
      // Получаем текущие зоны измерения объекта
      const object = await qualificationObjectService.getQualificationObjectById(qualificationObjectId);
      const existingZones = object.measurementZones || [];
      
      // Проверяем, есть ли уже зона "Внешний датчик" (зона с номером 0)
      const hasExternalZone = existingZones.some(zone => zone.zoneNumber === 0);
      
      if (hasExternalZone) {
        console.log('QualificationWorkScheduleService: Зона "Внешний датчик" уже существует');
        return;
      }
      
      // Создаем новую зону измерения "Внешний датчик" с номером 0
      const externalZone = {
        id: `zone-external-${Date.now()}`,
        zoneNumber: 0, // Внешний датчик всегда имеет номер 0
        measurementLevels: [
          {
            id: `level-external-${Date.now()}`,
            level: 1.0, // Высота 1 метр от пола
            equipmentId: `equipment-external-${Date.now()}`,
            equipmentName: 'Внешний датчик'
          }
        ]
      };
      
      // Добавляем новую зону к существующим
      const updatedZones = [...existingZones, externalZone];
      
      // Сохраняем обновленные зоны измерения
      await qualificationObjectService.updateMeasurementZones(qualificationObjectId, updatedZones);
      
      console.log('QualificationWorkScheduleService: Зона "Внешний датчик" успешно создана');
    } catch (error) {
      console.error('QualificationWorkScheduleService: Ошибка создания зоны "Внешний датчик":', error);
      // Не прерываем выполнение основного процесса из-за ошибки создания зоны
    }
  }

  /**
   * Создание всех этапов квалификационных работ для объекта
   */
  async createAllStages(qualificationObjectId: string, projectId?: string): Promise<QualificationWorkStage[]> {
    // Определяем все этапы квалификационных работ (7 этапов)
    const allStages = [
      {
        name: 'Расстановка логгеров',
        description: 'Установка и настройка логгеров для мониторинга температуры'
      },
      {
        name: 'Испытание на соответствие критериям в пустом объеме',
        description: 'Проверка соответствия температурных характеристик в пустом состоянии'
      },
      {
        name: 'Испытание на соответствие критериям в загруженном объеме',
        description: 'Проверка соответствия температурных характеристик при полной загрузке'
      },
      {
        name: 'Испытание на восстановление температуры после открытия двери',
        description: 'Проверка времени восстановления температурного режима после открытия'
      },
      {
        name: 'Испытание на отключение электропитания',
        description: 'Проверка поведения системы при отключении электропитания'
      },
      {
        name: 'Испытание на включение электропитания',
        description: 'Проверка запуска системы после включения электропитания'
      },
      {
        name: 'Снятие логгеров',
        description: 'Демонтаж и извлечение логгеров после завершения испытаний'
      }
    ];

    try {
      // Проверяем, какие этапы уже существуют для данного проекта
      const existingStages = await this.getWorkSchedule(qualificationObjectId, projectId);
      const existingStageNames = new Set(existingStages.map(stage => stage.stageName));
      
      console.log('QualificationWorkScheduleService: Существующие этапы для проекта:', projectId, existingStageNames);
      console.log('QualificationWorkScheduleService: Всего должно быть этапов:', allStages.length);
      
      // Определяем, какие этапы нужно создать
      const stagesToCreate = allStages.filter(stage => !existingStageNames.has(stage.name));
      
      if (stagesToCreate.length === 0) {
        console.log('QualificationWorkScheduleService: Все этапы уже существуют для проекта:', projectId);
        return existingStages;
      }
      
      console.log('QualificationWorkScheduleService: Создаем недостающие этапы для проекта:', projectId, stagesToCreate.map(s => s.name));

      // Создаем только недостающие этапы с привязкой к проекту (если поле существует)
      const stagesToInsert = stagesToCreate.map(stage => {
        const stageData: any = {
          qualification_object_id: qualificationObjectId,
          stage_name: stage.name,
          stage_description: stage.description,
          start_date: null,
          end_date: null,
          is_completed: false,
          completed_at: null,
          completed_by: null,
          cancelled_at: null,
          cancelled_by: null
        };
        
        // Добавляем project_id только если он передан
        if (projectId) {
          stageData.project_id = projectId;
        }
        
        return stageData;
      });

      // Сохраняем новые этапы через saveWorkSchedule
      const currentStages = existingStages.map(s => ({
        stageName: s.stageName,
        stageDescription: s.stageDescription,
        startDate: s.startDate,
        endDate: s.endDate,
        isCompleted: s.isCompleted,
        completedAt: s.completedAt,
        completedBy: s.completedBy,
        cancelledAt: s.cancelledAt,
        cancelledBy: s.cancelledBy
      }));
      
      const stagesToSave = [...currentStages, ...stagesToCreate.map(stage => ({
        stageName: stage.name,
        stageDescription: stage.description,
        startDate: undefined,
        endDate: undefined,
        isCompleted: false,
        completedAt: undefined,
        completedBy: undefined,
        cancelledAt: undefined,
        cancelledBy: undefined
      }))];
      
      const saved = await this.saveWorkSchedule(qualificationObjectId, stagesToSave, projectId);
      
      console.log('QualificationWorkScheduleService: Созданы недостающие этапы:', saved.length - existingStages.length);
      
      // Проверяем, был ли создан этап "Расстановка логгеров"
      const loggerPlacementCreated = stagesToCreate.some(stage => stage.name === 'Расстановка логгеров');
      
      if (loggerPlacementCreated) {
        console.log('QualificationWorkScheduleService: Создан этап "Расстановка логгеров", создаем зону "Внешний датчик"');
        // Автоматически создаем зону измерения "Внешний датчик"
        await this.createExternalSensorZone(qualificationObjectId);
      }
      
      // Возвращаем все этапы (существующие + новые)
      const allStagesResult = saved;
      
      console.log('QualificationWorkScheduleService: Итого этапов:', allStagesResult.length);
      return allStagesResult;
    } catch (error) {
      console.error('QualificationWorkScheduleService: Ошибка создания этапов:', error);
      throw error;
    }
  }
}

export const qualificationWorkScheduleService = new QualificationWorkScheduleService();
