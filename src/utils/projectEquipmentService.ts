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

export interface ProjectEquipmentAssignment {
  id: string;
  projectId: string;
  qualificationObjectId: string;
  equipmentId: string;
  zoneNumber: number;
  measurementLevel: number;
  assignedAt: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateProjectEquipmentAssignmentData {
  projectId: string;
  qualificationObjectId: string;
  equipmentId: string;
  zoneNumber: number;
  measurementLevel: number;
  notes?: string;
}

export interface DatabaseProjectEquipmentAssignment {
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

export class ProjectEquipmentService {
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
    assignments: CreateProjectEquipmentAssignmentData[]
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Сохраняем размещение оборудования:', {
        projectId,
        qualificationObjectId,
        assignments: assignments.length
      });

      // Удаляем существующие назначения для этого объекта в проекте
      const { error: deleteError } = await this.supabase
        .from('project_equipment_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId);

      if (deleteError) {
        console.error('Ошибка удаления старых назначений:', deleteError);
        throw new Error(`Ошибка удаления старых назначений: ${deleteError.message}`);
      }

      // Добавляем новые назначения если они есть
      if (assignments.length > 0) {
        const assignmentsToInsert = assignments.map(assignment => ({
          project_id: assignment.projectId,
          qualification_object_id: assignment.qualificationObjectId,
          equipment_id: assignment.equipmentId,
          zone_number: assignment.zoneNumber,
          measurement_level: assignment.measurementLevel,
          notes: assignment.notes || null
        }));

        const { error: insertError } = await this.supabase
          .from('project_equipment_assignments')
          .insert(assignmentsToInsert);

        if (insertError) {
          console.error('Ошибка добавления новых назначений:', insertError);
          throw new Error(`Ошибка добавления новых назначений: ${insertError.message}`);
        }
      }

      console.log('Размещение оборудования успешно сохранено');
    } catch (error) {
      console.error('Ошибка при сохранении размещения оборудования:', error);
      throw error;
    }
  }

  // Получение размещения оборудования для объекта квалификации
  async getEquipmentPlacement(
    projectId: string,
    qualificationObjectId: string
  ): Promise<ProjectEquipmentAssignment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .select('*')
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .order('zone_number', { ascending: true })
        .order('measurement_level', { ascending: true });

      if (error) {
        console.error('Ошибка получения размещения оборудования:', error);
        throw new Error(`Ошибка получения размещения оборудования: ${error.message}`);
      }

      return data.map((assignment: DatabaseProjectEquipmentAssignment) => ({
        id: assignment.id,
        projectId: assignment.project_id,
        qualificationObjectId: assignment.qualification_object_id,
        equipmentId: assignment.equipment_id,
        zoneNumber: assignment.zone_number,
        measurementLevel: assignment.measurement_level,
        assignedAt: new Date(assignment.assigned_at),
        completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
        notes: assignment.notes || undefined,
        createdAt: new Date(assignment.created_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении размещения оборудования:', error);
      throw error;
    }
  }

  // Получение всех назначений оборудования для проекта
  async getProjectEquipmentAssignments(projectId: string): Promise<ProjectEquipmentAssignment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .select('*')
        .eq('project_id', projectId)
        .order('qualification_object_id', { ascending: true })
        .order('zone_number', { ascending: true })
        .order('measurement_level', { ascending: true });

      if (error) {
        console.error('Ошибка получения назначений оборудования проекта:', error);
        throw new Error(`Ошибка получения назначений оборудования проекта: ${error.message}`);
      }

      return data.map((assignment: DatabaseProjectEquipmentAssignment) => ({
        id: assignment.id,
        projectId: assignment.project_id,
        qualificationObjectId: assignment.qualification_object_id,
        equipmentId: assignment.equipment_id,
        zoneNumber: assignment.zone_number,
        measurementLevel: assignment.measurement_level,
        assignedAt: new Date(assignment.assigned_at),
        completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
        notes: assignment.notes || undefined,
        createdAt: new Date(assignment.created_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении назначений оборудования проекта:', error);
      throw error;
    }
  }

  // Завершение назначения оборудования
  async completeAssignment(assignmentId: string, notes?: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('project_equipment_assignments')
        .update({
          completed_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Ошибка завершения назначения:', error);
        throw new Error(`Ошибка завершения назначения: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при завершении назначения:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const projectEquipmentService = new ProjectEquipmentService();