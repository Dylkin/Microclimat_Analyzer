import { supabase } from './supabaseClient';
import { 
  Project, 
  ProjectStatus,
  ProjectQualificationObject,
  ProjectStageAssignment,
  CreateProjectData, 
  UpdateProjectData 
} from '../types/Project';

interface DatabaseProject {
  id: string;
  name: string;
  description: string | null;
  contractor_id: string;
  contract_number: string | null;
  contract_date: string | null;
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
    this.supabase = supabase;
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
  async getProjectById(id: string): Promise<Project> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { data: projectData, error: projectError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        console.error('Ошибка получения проекта:', projectError);
        throw new Error(`Ошибка получения проекта: ${projectError.message}`);
      }

      if (!projectData) {
        throw new Error('Проект не найден');
      }

      // Преобразуем данные из базы в формат Project
      console.log('ProjectService: Данные проекта из БД:', {
        id: projectData.id,
        name: projectData.name,
        contract_number: projectData.contract_number,
        contract_date: projectData.contract_date,
        rawData: projectData
      });

      const project: Project = {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        contractorId: projectData.contractor_id,
        contractNumber: projectData.contract_number,
        contractDate: projectData.contract_date ? new Date(projectData.contract_date) : undefined,
        status: projectData.status,
        createdBy: projectData.created_by,
        createdAt: new Date(projectData.created_at),
        updatedAt: new Date(projectData.updated_at),
        qualificationObjects: [],
        stageAssignments: []
      };

      console.log('ProjectService: Преобразованный объект Project:', {
        id: project.id,
        name: project.name,
        contractNumber: project.contractNumber,
        contractDate: project.contractDate
      });

      return project;
    } catch (error) {
      console.error('Ошибка при получении проекта:', error);
      throw error;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Проверяем подключение к Supabase
      if (!this.supabase) {
        throw new Error('Supabase клиент не инициализирован');
      }

      // Получаем проекты
      const { data: projectsData, error: projectsError } = await this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Ошибка получения проектов:', projectsError);
        
        // Специальная обработка ошибок подключения
        if (projectsError.message?.includes('fetch') || projectsError.message?.includes('network')) {
          throw new Error('Ошибка сети при подключении к Supabase. Проверьте URL проекта.');
        }
        if (projectsError.message?.includes('Invalid API key') || projectsError.message?.includes('unauthorized')) {
          throw new Error('Неверный ключ API Supabase. Проверьте VITE_SUPABASE_ANON_KEY.');
        }
        
        throw new Error(`Ошибка получения проектов: ${projectsError.message}`);
      }

      if (!projectsData) {
        console.warn('Получен null/undefined ответ от Supabase');
        return [];
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
          qualification_objects (
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
      const contractorsMap = new Map(contractorsData?.map((c: any) => [c.id, c.name]) || []);
      const usersMap = new Map(usersData?.map((u: any) => [u.id, u.full_name]) || []);
      
      // Группируем объекты квалификации по проектам
      const qualificationObjectsByProject = new Map<string, ProjectQualificationObject[]>();
      qualificationObjectsData?.forEach((pqo: any) => {
        if (!qualificationObjectsByProject.has(pqo.project_id)) {
          qualificationObjectsByProject.set(pqo.project_id, []);
        }
        
        const objectName = pqo.qualification_objects?.name || 
                          pqo.qualification_objects?.vin || 
                          pqo.qualification_objects?.serial_number || 
                          'Без названия';
        
        qualificationObjectsByProject.get(pqo.project_id)!.push({
          id: pqo.id,
          projectId: pqo.project_id,
          qualificationObjectId: pqo.qualification_object_id,
          qualificationObjectName: objectName,
          qualificationObjectType: pqo.qualification_objects?.type,
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
          assignedUserName: assignment.assigned_user_id ? (usersMap.get(assignment.assigned_user_id) as string | undefined) : undefined,
          assignedAt: new Date(assignment.assigned_at),
          completedAt: assignment.completed_at ? new Date(assignment.completed_at) : undefined,
          notes: assignment.notes || undefined,
          createdAt: new Date(assignment.created_at)
        });
      });

      // Формируем результат
      const result = projectsData.map((project: DatabaseProject) => {
        const mappedProject = {
          id: project.id,
          name: project.name,
          description: project.description || undefined,
          contractorId: project.contractor_id,
          contractorName: contractorsMap.get(project.contractor_id),
          contractNumber: project.contract_number || undefined,
          contractDate: project.contract_date ? new Date(project.contract_date) : undefined,
          status: project.status,
          createdBy: project.created_by || undefined,
          createdByName: project.created_by ? usersMap.get(project.created_by) : undefined,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
          qualificationObjects: qualificationObjectsByProject.get(project.id) || [],
          stageAssignments: stageAssignmentsByProject.get(project.id) || []
        };

        // Логирование для диагностики конкретного проекта
        if (project.id === '36b01543-0e89-4954-956a-77a370f78954') {
          console.log('ProjectService: getAllProjects - маппинг проекта PharmDistri:', {
            rawProject: {
              id: project.id,
              name: project.name,
              contract_number: project.contract_number,
              contract_date: project.contract_date
            },
            mappedProject: {
              id: mappedProject.id,
              name: mappedProject.name,
              contractNumber: mappedProject.contractNumber,
              contractDate: mappedProject.contractDate
            }
          });
        }

        return mappedProject;
      });

      console.log('ProjectService: getAllProjects - загружено проектов:', result.length);
      return result;
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
        const qualificationObjectsToInsert = projectData.qualificationObjectIds.map(objectId => ({
          project_id: projectResult.id,
          qualification_object_id: objectId
        }));

        const { error: qualificationObjectsError } = await this.supabase
          .from('project_qualification_objects')
          .insert(qualificationObjectsToInsert);

        if (qualificationObjectsError) {
          console.error('Ошибка добавления объектов квалификации:', qualificationObjectsError);
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

      // name не может быть обновлен через UpdateProjectData
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.contractNumber !== undefined) updateData.contract_number = updates.contractNumber;
      if (updates.contractDate !== undefined) updateData.contract_date = updates.contractDate.toISOString().split('T')[0];
      if (updates.status !== undefined) updateData.status = updates.status;

      console.log('ProjectService: Обновление проекта', {
        projectId: id,
        updates,
        updateData
      });

      const { data, error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('ProjectService: Результат обновления', { data, error });

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
      console.log('ProjectService: Загружаем обновленный проект из БД');
      const updatedProject = await this.getProjectById(id);
      console.log('ProjectService: Обновленный проект загружен:', {
        id: updatedProject.id,
        contractNumber: updatedProject.contractNumber,
        contractDate: updatedProject.contractDate
      });

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