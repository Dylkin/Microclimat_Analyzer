import { createClient } from '@supabase/supabase-js';
import { 
  ProjectEquipmentAssignment,
  CreateProjectEquipmentAssignmentData,
  UpdateProjectEquipmentAssignmentData,
  DatabaseProjectEquipmentAssignment
} from '../types/ProjectEquipmentAssignment';

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

export class ProjectEquipmentService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение назначений оборудования для проекта
  async getProjectEquipmentAssignments(projectId: string): Promise<ProjectEquipmentAssignment[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Загружаем назначения оборудования для проекта:', projectId);

      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .select(`
          *,
          measurement_equipment (
            id,
            type,
            name,
            serial_number
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Ошибка получения назначений оборудования:', error);
        throw new Error(`Ошибка получения назначений оборудования: ${error.message}`);
      }

      console.log('Загружено назначений оборудования:', data?.length || 0);

      return data.map((assignment: any) => ({
        id: assignment.id,
        projectId: assignment.project_id,
        qualificationObjectId: assignment.qualification_object_id,
        equipmentId: assignment.equipment_id,
        equipmentName: assignment.measurement_equipment?.name,
        equipmentType: assignment.measurement_equipment?.type,
        equipmentSerialNumber: assignment.measurement_equipment?.serial_number,
        assignedAt: new Date(assignment.assigned_at),
        completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
        notes: assignment.notes || undefined,
        createdAt: new Date(assignment.created_at)
      }));
    } catch (error) {
      console.error('Ошибка при получении назначений оборудования:', error);
      throw error;
    }
  }

  // Добавление назначения оборудования
  async addEquipmentAssignment(assignmentData: CreateProjectEquipmentAssignmentData): Promise<ProjectEquipmentAssignment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем назначение оборудования:', assignmentData);

      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .insert({
          project_id: assignmentData.projectId,
          qualification_object_id: assignmentData.qualificationObjectId,
          equipment_id: assignmentData.equipmentId,
          notes: assignmentData.notes || null
        })
        .select(`
          *,
          measurement_equipment (
            id,
            type,
            name,
            serial_number
          )
        `)
        .single();

      if (error) {
        console.error('Ошибка добавления назначения оборудования:', error);
        if (error.code === '23505') {
          throw new Error('Это оборудование уже назначено для данного объекта квалификации');
        }
        throw new Error(`Ошибка добавления назначения оборудования: ${error.message}`);
      }

      console.log('Назначение оборудования успешно добавлено:', data);

      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        equipmentId: data.equipment_id,
        equipmentName: data.measurement_equipment?.name,
        equipmentType: data.measurement_equipment?.type,
        equipmentSerialNumber: data.measurement_equipment?.serial_number,
        assignedAt: new Date(data.assigned_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        notes: data.notes || undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при добавлении назначения оборудования:', error);
      throw error;
    }
  }

  // Обновление назначения оборудования
  async updateEquipmentAssignment(
    assignmentId: string, 
    updates: UpdateProjectEquipmentAssignmentData
  ): Promise<ProjectEquipmentAssignment> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};
      
      if (updates.completedAt !== undefined) {
        updateData.completed_at = updates.completedAt ? updates.completedAt.toISOString() : null;
      }
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes || null;
      }

      const { data, error } = await this.supabase
        .from('project_equipment_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select(`
          *,
          measurement_equipment (
            id,
            type,
            name,
            serial_number
          )
        `)
        .single();

      if (error) {
        console.error('Ошибка обновления назначения оборудования:', error);
        throw new Error(`Ошибка обновления назначения оборудования: ${error.message}`);
      }

      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        equipmentId: data.equipment_id,
        equipmentName: data.measurement_equipment?.name,
        equipmentType: data.measurement_equipment?.type,
        equipmentSerialNumber: data.measurement_equipment?.serial_number,
        assignedAt: new Date(data.assigned_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        notes: data.notes || undefined,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Ошибка при обновлении назначения оборудования:', error);
      throw error;
    }
  }

  // Удаление назначения оборудования
  async deleteEquipmentAssignment(assignmentId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('project_equipment_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Ошибка удаления назначения оборудования:', error);
        throw new Error(`Ошибка удаления назначения оборудования: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении назначения оборудования:', error);
      throw error;
    }
  }

  // Завершение испытаний для объекта квалификации
  async completeObjectTesting(projectId: string, qualificationObjectId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const completedAt = new Date();

      const { error } = await this.supabase
        .from('project_equipment_assignments')
        .update({ completed_at: completedAt.toISOString() })
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId);

      if (error) {
        console.error('Ошибка завершения испытаний объекта:', error);
        throw new Error(`Ошибка завершения испытаний объекта: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при завершении испытаний объекта:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const projectEquipmentService = new ProjectEquipmentService();