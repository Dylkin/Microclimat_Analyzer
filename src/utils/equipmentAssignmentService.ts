import { createClient } from '@supabase/supabase-js';

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

export interface EquipmentAssignment {
  id: string;
  projectId: string;
  qualificationObjectId: string;
  equipmentId: string;
  equipmentName?: string;
  zoneNumber: number;
  measurementLevel: number;
  assignedAt: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface DatabaseEquipmentAssignment {
  id: string;
  project_id: string;
  qualification_object_id: string;
  equipment_id: string;
  zone_number: number;
  measurement_level: number;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface EquipmentPlacement {
  zones: {
    zoneNumber: number;
    levels: {
      levelValue: number;
      equipmentId: string;
      equipmentName?: string;
    }[];
  }[];
}

export class EquipmentAssignmentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Сохранение размещения оборудования для объекта квалификации
  async saveEquipmentPlacement(
    projectId: string,
    qualificationObjectId: string,
    placement: EquipmentPlacement
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Сохраняем размещение оборудования:', {
        projectId,
        qualificationObjectId,
        placement
      });

      // Сначала удаляем существующие назначения для этого объекта в проекте
      const { error: deleteError } = await this.supabase
        .from('project_equipment_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId);

      if (deleteError) {
        console.error('Ошибка удаления старых назначений:', deleteError);
        throw new Error(`Ошибка удаления старых назначений: ${deleteError.message}`);
      }

      // Подготавливаем данные для вставки
      const assignmentsToInsert: any[] = [];
      const usedEquipmentIds = new Set<string>(); // Отслеживаем уже использованное оборудование

      placement.zones.forEach(zone => {
        zone.levels.forEach(level => {
          if (level.equipmentId && level.equipmentId.trim()) {
            // Проверяем, что оборудование не используется дважды в одном объекте
            if (usedEquipmentIds.has(level.equipmentId)) {
              console.warn(`Оборудование ${level.equipmentId} уже используется в другой зоне/уровне этого объекта`);
              return; // Пропускаем дублирующееся оборудование
            }
            
            usedEquipmentIds.add(level.equipmentId);
            
            assignmentsToInsert.push({
              project_id: projectId,
              qualification_object_id: qualificationObjectId,
              equipment_id: level.equipmentId,
              zone_number: zone.zoneNumber,
              measurement_level: level.levelValue,
              assigned_at: new Date().toISOString(),
              notes: null
            });
          }
        });
      });

      // Вставляем новые назначения если есть что вставлять
      if (assignmentsToInsert.length > 0) {
        console.log(`Подготовлено ${assignmentsToInsert.length} уникальных назначений для вставки`);
        
        const { data: insertData, error: insertError } = await this.supabase
          .from('project_equipment_assignments')
          .insert(assignmentsToInsert)
          .select();

        if (insertError) {
          console.error('Ошибка вставки назначений:', insertError);
          console.error('Данные для вставки:', assignmentsToInsert);
          throw new Error(`Ошибка сохранения назначений: ${insertError.message}`);
        }

        console.log(`Сохранено ${insertData?.length || 0} назначений оборудования`);
      } else {
        console.log('Нет назначений для сохранения');
      }
    } catch (error) {
      console.error('Ошибка при сохранении размещения оборудования:', error);
      throw error;
    }
  }

  // Загрузка размещения оборудования для объекта квалификации
  async getEquipmentPlacement(
    projectId: string,
    qualificationObjectId: string
  ): Promise<EquipmentPlacement> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .select(`
          *,
          equipment:measurement_equipment(name)
        `)
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .order('zone_number', { ascending: true })
        .order('measurement_level', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки размещения оборудования:', error);
        throw new Error(`Ошибка загрузки размещения: ${error.message}`);
      }

      // Группируем данные по зонам
      const zonesMap = new Map<number, {
        zoneNumber: number;
        levels: {
          levelValue: number;
          equipmentId: string;
          equipmentName?: string;
        }[];
      }>();

      data?.forEach((assignment: any) => {
        const zoneNumber = assignment.zone_number;
        
        if (!zonesMap.has(zoneNumber)) {
          zonesMap.set(zoneNumber, {
            zoneNumber,
            levels: []
          });
        }

        zonesMap.get(zoneNumber)!.levels.push({
          levelValue: parseFloat(assignment.measurement_level) || 0,
          equipmentId: assignment.equipment_id,
          equipmentName: assignment.equipment?.name
        });
      });

      // Преобразуем в массив и сортируем по номеру зоны
      const zones = Array.from(zonesMap.values()).sort((a, b) => a.zoneNumber - b.zoneNumber);

      return { zones };
    } catch (error) {
      console.error('Ошибка при загрузке размещения оборудования:', error);
      throw error;
    }
  }

  // Получение всех назначений оборудования для проекта
  async getProjectEquipmentAssignments(projectId: string): Promise<EquipmentAssignment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .select(`
          *,
          equipment:measurement_equipment(name),
          qualification_object:qualification_objects(name, type)
        `)
        .eq('project_id', projectId)
        .order('zone_number', { ascending: true })
        .order('measurement_level', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки назначений оборудования:', error);
        throw new Error(`Ошибка загрузки назначений: ${error.message}`);
      }

      return data.map((assignment: any) => ({
        id: assignment.id,
        projectId: assignment.project_id,
        qualificationObjectId: assignment.qualification_object_id,
        equipmentId: assignment.equipment_id,
        equipmentName: assignment.equipment?.name,
        zoneNumber: assignment.zone_number,
        measurementLevel: parseFloat(assignment.measurement_level) || 0,
        assignedAt: new Date(assignment.assigned_at),
        completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
        notes: assignment.notes || undefined,
        createdAt: new Date(assignment.created_at)
      }));
    } catch (error) {
      console.error('Ошибка при загрузке назначений оборудования:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const equipmentAssignmentService = new EquipmentAssignmentService();