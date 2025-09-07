import { createClient } from '@supabase/supabase-js';
import { 
  Project, 
  ProjectStatus,
  ProjectQualificationObject,
  ProjectStageAssignment,
  CreateProjectData, 
  UpdateProjectData 
} from '../types/Project';

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

interface DatabaseProject {
  id: string;
  name: string;
  description: string | null;
  contractor_id: string;
  contract_number: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseProjectQualificationObject {
  id: string;
  project_id: string;
  qualification_object_id: string;
  created_at: string;
}

interface DatabaseProjectStageAssignment {
  id: string;
  project_id: string;
  stage: ProjectStatus;
  assigned_user_id: string | null;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

class ProjectService {
  private supabase: any;

  constructor() {
    this.supabase = initSupabase();
  }

  // UUID validation function
  private isValidUUID(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Получение всех проектов с связанными данными
  async getAllProjects(): Promise<Project[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Получаем проекты
      const { data: projectsData, error: projectsError } = await this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Ошибка получения проектов:', projectsError);
        throw new Error(`Ошибка получения проектов: ${projectsError.message}`);
      }

      // Получаем контрагентов
      const { data: contractorsData, error: contractorsError } = await this.supabase
        .from('contractors')
        .select('id, name');

      if (contractorsError) {
        console.error('Ошибка получения контрагентов:', contractorsError);
      }

      // Получаем пользователей
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, full_name');

      if (usersError) {
        console.error('Ошибка получения пользователей:', usersError);
      }

      // Получаем объекты квалификации для проектов
      const { data: qualificationObjectsData, error: qualificationObjectsError } = await this.supabase
        .from('project_qualification_objects')
        .select(`
          *,
          qualification_object:qualification_objects (
            id,
            name,
            type,
            vin,
            serial_number
          )
        `);

      if (qualificationObjectsError) {
        console.error('Ошибка получения объектов квалификации:', qualificationObjectsError);
      }

      // Получаем назначения этапов
      const { data: stageAssignmentsData, error: stageAssignmentsError } = await this.supabase
        .from('project_stage_assignments')
        .select('*');

      if (stageAssignmentsError) {
        console.error('Ошибка получения назначений этапов:', stageAssignmentsError);
      }

      // Создаем карты для быстрого поиска
      const contractorsMap = new Map(contractorsData?.map(c => [c.id, c.name]) || []);
      const usersMap = new Map(usersData?.map(u => [u.id, u.full_name]) || []);
      
      // Группируем объекты квалификации по проектам
      const qualificationObjectsByProject = new Map<string, ProjectQualificationObject[]>();
      qualificationObjectsData?.forEach((pqo: any) => {
        console.log('Обрабатываем связь проект-объект:', {
          projectId: pqo.project_id,
          qualificationObjectId: pqo.qualification_object_id,
          objectData: pqo.qualification_object
        });
        
        if (!qualificationObjectsByProject.has(pqo.project_id)) {
          qualificationObjectsByProject.set(pqo.project_id, []);
        }
        
        const objectName = pqo.qualification_object?.name || 
                          pqo.qualification_object?.vin || 
                          pqo.qualification_object?.serial_number || 
                          'Без названия';
        
        qualificationObjectsByProject.get(pqo.project_id)!.push({
          id: pqo.id,
          projectId: pqo.project_id,
          qualificationObjectId: pqo.qualification_object_id,
          qualificationObjectName: objectName,
          qualificationObjectType: pqo.qualification_object?.type,
          createdAt: new Date(pqo.created_at)
        });
      });

      // Группируем назначения этапов по проектам
      const stageAssignmentsByProject = new Map<string, ProjectStageAssignment[]>();
      stageAssignmentsData?.forEach((assignment: DatabaseProjectStageAssignment) => {
        if (!stageAssignmentsByProject.has(assignment.project_id)) {
          stageAssignmentsByProject.set(assignment.project_id, []);
        }
        
        stageAssignmentsByProject.get(assignment.project_id)!.push({
          id: assignment.id,
          projectId: assignment.project_id,
          stage: assignment.stage,
          assignedUserId: assignment.assigned_user_id || undefined,
          assignedUserName: assignment.assigned_user_id ? usersMap.get(assignment.assigned_user_id) : undefined,
          assignedAt: new Date(assignment.assigned_at),
          completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
          notes: assignment.notes || undefined,
          createdAt: new Date(assignment.created_at)
        });
      });

      // Формируем результат
      const projects = projectsData.map((project: DatabaseProject) => {
        const projectQualificationObjects = qualificationObjectsByProject.get(project.id) || [];
        
        console.log(`Проект "${project.name}" (ID: ${project.id}) содержит объектов квалификации:`, projectQualificationObjects.length);
        console.log('ID объектов:', projectQualificationObjects.map(obj => obj.qualificationObjectId));
        
        return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        contractorId: project.contractor_id,
        contractorName: contractorsMap.get(project.contractor_id),
        contractNumber: project.contract_number || undefined,
        status: project.status,
        createdBy: project.created_by || undefined,
        createdByName: project.created_by ? usersMap.get(project.created_by) : undefined,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        qualificationObjects: projectQualificationObjects,
        stageAssignments: stageAssignmentsByProject.get(project.id) || []
        };
      });
      
      console.log('Всего загружено проектов:', projects.length);
      return projects;
    } catch (error) {
      console.error('Ошибка при получении проектов:', error);
      throw error;
    }
  }

  // Добавление нового проекта
  async addProject(projectData: CreateProjectData, userId?: string): Promise<Project> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Добавляем проект:', projectData);
      console.log('Выбранные объекты квалификации:', projectData.qualificationObjectIds);

      // Валидация UUID контрагента
      if (!this.isValidUUID(projectData.contractorId)) {
        console.error('Некорректный UUID контрагента:', projectData.contractorId);
        throw new Error(`Некорректный ID контрагента: ${projectData.contractorId}. Ожидается UUID формат.`);
      }

      // Валидация UUID объектов квалификации
      const invalidQualificationObjectIds = projectData.qualificationObjectIds.filter(id => !this.isValidUUID(id));
      if (invalidQualificationObjectIds.length > 0) {
        console.error('Некорректные UUID объектов квалификации:', invalidQualificationObjectIds);
        throw new Error(`Некорректные ID объектов квалификации: ${invalidQualificationObjectIds.join(', ')}. Ожидается UUID формат.`);
      }

      // Валидация UUID пользователя если указан
      if (userId && !this.isValidUUID(userId)) {
        console.error('Некорректный UUID пользователя:', userId);
        console.warn(`Некорректный ID пользователя: ${userId}. Используем null вместо некорректного ID.`);
        userId = undefined; // Устанавливаем undefined для некорректного UUID
      }

      // Добавляем проект
      const { data: projectResult, error: projectError } = await this.supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description || null,
          contractor_id: projectData.contractorId,
          created_by: userId || null
        })
        .select()
        .single();

      if (projectError) {
        console.error('Ошибка добавления проекта:', projectError);
        throw new Error(`Ошибка добавления проекта: ${projectError.message}`);
      }

      // Добавляем связи с объектами квалификации
      if (projectData.qualificationObjectIds.length > 0) {
        console.log('Добавляем связи с объектами квалификации:', projectData.qualificationObjectIds);
        const qualificationObjectsToInsert = projectData.qualificationObjectIds.map(objectId => ({
          project_id: projectResult.id,
          qualification_object_id: objectId
        }));
        
        console.log('Данные для вставки в project_qualification_objects:', qualificationObjectsToInsert);

        const { error: qualificationObjectsError } = await this.supabase
          .from('project_qualification_objects')
          .insert(qualificationObjectsToInsert);

        if (qualificationObjectsError) {
          console.error('Ошибка добавления объектов квалификации:', qualificationObjectsError);
          throw new Error(`Ошибка добавления объектов квалификации: ${qualificationObjectsError.message}`);
        } else {
          console.log('Связи с объектами квалификации успешно добавлены');
        }
      }

      // Добавляем назначения этапов
      if (projectData.stageAssignments && projectData.stageAssignments.length > 0) {
        const stageAssignmentsToInsert = projectData.stageAssignments.map(assignment => ({
          project_id: projectResult.id,
          stage: assignment.stage,
          assigned_user_id: assignment.assignedUserId || null,
          notes: assignment.notes || null
        }));

        const { error: stageAssignmentsError } = await this.supabase
          .from('project_stage_assignments')
          .insert(stageAssignmentsToInsert);

        if (stageAssignmentsError) {
          console.error('Ошибка добавления назначений этапов:', stageAssignmentsError);
        }
      }

      console.log('Проект успешно добавлен:', projectResult);

      // Возвращаем созданный проект
      const projects = await this.getAllProjects();
      const createdProject = projects.find(p => p.id === projectResult.id);
      
      if (!createdProject) {
        throw new Error('Не удалось найти созданный проект');
      }

      console.log('Созданный проект содержит объектов квалификации:', createdProject.qualificationObjects.length);
      console.log('ID объектов в созданном проекте:', createdProject.qualificationObjects.map(obj => obj.qualificationObjectId));
      return createdProject;
    } catch (error) {
      console.error('Ошибка при добавлении проекта:', error);
      throw error;
    }
  }

  // Обновление проекта
  async updateProject(id: string, updates: UpdateProjectData): Promise<Project> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.contractNumber !== undefined) updateData.contract_number = updates.contractNumber;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Ошибка обновления проекта:', error);
        throw new Error(`Ошибка обновления проекта: ${error.message}`);
      }

      // Обновляем объекты квалификации если указаны
      if (updates.qualificationObjectIds !== undefined) {
        // Удаляем старые связи
        await this.supabase
          .from('project_qualification_objects')
          .delete()
          .eq('project_id', id);

        // Добавляем новые связи
        if (updates.qualificationObjectIds.length > 0) {
          const qualificationObjectsToInsert = updates.qualificationObjectIds.map(objectId => ({
            project_id: id,
            qualification_object_id: objectId
          }));

          const { error: qualificationObjectsError } = await this.supabase
            .from('project_qualification_objects')
            .insert(qualificationObjectsToInsert);

          if (qualificationObjectsError) {
            console.error('Ошибка обновления объектов квалификации:', qualificationObjectsError);
          }
        }
      }

      // Возвращаем обновленный проект
      const projects = await this.getAllProjects();
      const updatedProject = projects.find(p => p.id === id);
      
      if (!updatedProject) {
        throw new Error('Не удалось найти обновленный проект');
      }

      return updatedProject;
    } catch (error) {
      console.error('Ошибка при обновлении проекта:', error);
      throw error;
    }
  }

  // Удаление проекта
  async deleteProject(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка удаления проекта:', error);
        throw new Error(`Ошибка удаления проекта: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении проекта:', error);
      throw error;
    }
  }

  // Обновление назначения этапа
  async updateStageAssignment(
    projectId: string, 
    stage: ProjectStatus, 
    assignedUserId?: string, 
    notes?: string,
    completed?: boolean
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const updateData: any = {
        assigned_user_id: assignedUserId || null,
        notes: notes || null
      };

      if (completed !== undefined) {
        updateData.completed_at = completed ? new Date().toISOString() : null;
      }

      const { error } = await this.supabase
        .from('project_stage_assignments')
        .upsert({
          project_id: projectId,
          stage: stage,
          ...updateData
        });

      if (error) {
        console.error('Ошибка обновления назначения этапа:', error);
        throw new Error(`Ошибка обновления назначения этапа: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка при обновлении назначения этапа:', error);
      throw error;
    }
  }
}

// Экспорт синглтона сервиса
export const projectService = new ProjectService();