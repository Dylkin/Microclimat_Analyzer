import { supabase } from './supabaseClient';
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
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  isAvailable(): boolean {
    return !!this.supabase;
  }

  async getWorkSchedule(qualificationObjectId: string, projectId?: string): Promise<QualificationWorkStage[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    let query = this.supabase!
      .from('qualification_work_schedule')
      .select('*')
      .eq('qualification_object_id', qualificationObjectId);

    // Если передан projectId, пытаемся фильтровать по проекту
    // Если поле project_id не существует, это не критично - просто игнорируем фильтр
    if (projectId) {
      try {
        query = query.eq('project_id', projectId);
      } catch (error) {
        console.warn('QualificationWorkScheduleService: Поле project_id не найдено в таблице, используем фильтр только по qualification_object_id');
        // Продолжаем без фильтра по project_id
      }
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Ошибка загрузки расписания: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    console.log('QualificationWorkScheduleService: Сырые данные из БД:', data);
    const mappedData = data.map(this.mapFromDatabase);
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
  }

  async saveWorkSchedule(qualificationObjectId: string, stages: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>[], projectId?: string): Promise<QualificationWorkStage[]> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Сначала удаляем существующие записи для этого объекта и проекта
      let deleteQuery = this.supabase!
        .from('qualification_work_schedule')
        .delete()
        .eq('qualification_object_id', qualificationObjectId);

      // Если передан projectId, добавляем фильтр по проекту
      if (projectId) {
        try {
          deleteQuery = deleteQuery.eq('project_id', projectId);
        } catch (error) {
          console.warn('QualificationWorkScheduleService: Поле project_id не найдено в таблице, удаляем только по qualification_object_id');
        }
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        throw new Error(`Ошибка удаления старых записей: ${deleteError.message}`);
      }

      // Подготавливаем данные для вставки
      const stagesToInsert = stages.map(stage => {
        const insertData: any = {
          qualification_object_id: qualificationObjectId,
          stage_name: stage.stageName,
          stage_description: stage.stageDescription,
          start_date: stage.startDate || null,
          end_date: stage.endDate || null,
          is_completed: stage.isCompleted,
          completed_at: stage.completedAt || null,
          completed_by: stage.completedBy || null,
          cancelled_at: stage.cancelledAt || null,
          cancelled_by: stage.cancelledBy || null
        };

        // Добавляем project_id, если он передан
        if (projectId) {
          insertData.project_id = projectId;
        }

        return insertData;
      });

      // Вставляем новые записи
      const { data, error } = await this.supabase!
        .from('qualification_work_schedule')
        .insert(stagesToInsert)
        .select('*');

      if (error) {
        throw new Error(`Ошибка сохранения расписания: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data.map(this.mapFromDatabase);
    } catch (error) {
      console.error('Ошибка сохранения расписания:', error);
      throw error;
    }
  }

  async deleteWorkSchedule(qualificationObjectId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { error } = await this.supabase!
      .from('qualification_work_schedule')
      .delete()
      .eq('qualification_object_id', qualificationObjectId);

    if (error) {
      throw new Error(`Ошибка удаления расписания: ${error.message}`);
    }
  }

  async createWorkStage(qualificationObjectId: string, stageData: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>): Promise<QualificationWorkStage> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    const { data, error } = await this.supabase!
      .from('qualification_work_schedule')
      .insert({
        qualification_object_id: qualificationObjectId,
        stage_name: stageData.stageName,
        stage_description: stageData.stageDescription,
        start_date: stageData.startDate || null,
        end_date: stageData.endDate || null,
        is_completed: stageData.isCompleted,
        completed_at: stageData.completedAt || null,
        completed_by: stageData.completedBy || null,
        cancelled_at: stageData.cancelledAt || null,
        cancelled_by: stageData.cancelledBy || null
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Ошибка создания этапа: ${error.message}`);
    }

    const createdStage = this.mapFromDatabase(data);
    
    // Если создан этап "Расстановка логгеров", автоматически создаем зону "Внешний датчик"
    if (stageData.stageName === 'Расстановка логгеров') {
      console.log('QualificationWorkScheduleService: Создан этап "Расстановка логгеров", создаем зону "Внешний датчик"');
      await this.createExternalSensorZone(qualificationObjectId);
    }

    return createdStage;
  }

  async updateWorkStage(qualificationObjectId: string, stageId: string, stageData: Omit<QualificationWorkStage, 'id' | 'qualificationObjectId' | 'createdAt' | 'updatedAt'>): Promise<QualificationWorkStage> {
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

    console.log('QualificationWorkScheduleService: updateWorkStage - данные для сохранения:', {
      stageId,
      qualificationObjectId,
      stageData: {
        stageName: stageData.stageName,
        startDate: stageData.startDate,
        endDate: stageData.endDate,
        isCompleted: stageData.isCompleted,
        completedAt: stageData.completedAt,
        completedBy: stageData.completedBy,
        cancelledAt: stageData.cancelledAt,
        cancelledBy: stageData.cancelledBy
      }
    });

    const updateData = {
      stage_name: stageData.stageName,
      stage_description: stageData.stageDescription,
      start_date: stageData.startDate || null,
      end_date: stageData.endDate || null,
      is_completed: stageData.isCompleted,
      completed_at: stageData.completedAt || null,
      completed_by: stageData.completedBy || null,
      cancelled_at: stageData.cancelledAt || null,
      cancelled_by: stageData.cancelledBy || null
    };

    console.log('QualificationWorkScheduleService: updateWorkStage - данные для UPDATE:', updateData);

    const { data, error } = await this.supabase!
      .from('qualification_work_schedule')
      .update(updateData)
      .eq('id', stageId)
      .eq('qualification_object_id', qualificationObjectId)
      .select('*')
      .single();

    if (error) {
      console.error('QualificationWorkScheduleService: updateWorkStage - ошибка:', error);
      throw new Error(`Ошибка обновления этапа: ${error.message}`);
    }

    console.log('QualificationWorkScheduleService: updateWorkStage - результат UPDATE:', data);
    return this.mapFromDatabase(data);
  }

  private mapFromDatabase(data: any): QualificationWorkStage {
    const mapped = {
      id: data.id,
      qualificationObjectId: data.qualification_object_id,
      projectId: data.project_id || undefined, // Добавляем project_id, если он существует
      stageName: data.stage_name,
      stageDescription: data.stage_description,
      startDate: data.start_date,
      endDate: data.end_date,
      isCompleted: data.is_completed,
      completedAt: data.completed_at,
      completedBy: data.completed_by,
      cancelledAt: data.cancelled_at,
      cancelledBy: data.cancelled_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('QualificationWorkScheduleService: mapFromDatabase для этапа:', data.stage_name, {
      raw: {
        start_date: data.start_date,
        end_date: data.end_date,
        is_completed: data.is_completed,
        completed_at: data.completed_at,
        completed_by: data.completed_by,
        cancelled_at: data.cancelled_at,
        cancelled_by: data.cancelled_by
      },
      mapped: {
        startDate: mapped.startDate,
        endDate: mapped.endDate,
        isCompleted: mapped.isCompleted,
        completedAt: mapped.completedAt,
        completedBy: mapped.completedBy,
        cancelledAt: mapped.cancelledAt,
        cancelledBy: mapped.cancelledBy
      }
    });
    
    return mapped;
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
    if (!this.isAvailable()) {
      throw new Error('Supabase не настроен');
    }

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

      const { data, error } = await this.supabase!
        .from('qualification_work_schedule')
        .insert(stagesToInsert)
        .select('*');

      if (error) {
        throw new Error(`Ошибка создания этапов: ${error.message}`);
      }

      console.log('QualificationWorkScheduleService: Созданы недостающие этапы:', data?.length);
      
      // Проверяем, был ли создан этап "Расстановка логгеров"
      const loggerPlacementCreated = stagesToCreate.some(stage => stage.name === 'Расстановка логгеров');
      
      if (loggerPlacementCreated) {
        console.log('QualificationWorkScheduleService: Создан этап "Расстановка логгеров", создаем зону "Внешний датчик"');
        // Автоматически создаем зону измерения "Внешний датчик"
        await this.createExternalSensorZone(qualificationObjectId);
      }
      
      // Возвращаем все этапы (существующие + новые)
      const newStages = data ? data.map(this.mapFromDatabase) : [];
      const allStagesResult = [...existingStages, ...newStages];
      
      console.log('QualificationWorkScheduleService: Итого этапов:', allStagesResult.length);
      return allStagesResult;
    } catch (error) {
      console.error('QualificationWorkScheduleService: Ошибка создания этапов:', error);
      throw error;
    }
  }
}

export const qualificationWorkScheduleService = new QualificationWorkScheduleService();
