import { supabase } from '../lib/supabase';
import { Project, QualificationObject, QualificationStage } from '../types/Project';
import { Database } from '../lib/database.types';

// Mock data for fallback when database is not available
const mockProjects: Project[] = [
  {
    id: 'mock-1',
    description: 'Картирование температурных условий в складском помещении',
    type: 'mapping',
    status: 'in_progress',
    contractorId: 'client-1',
    contractorName: 'ООО "Фармацевтическая компания"',
    managerId: 'manager-1',
    managerName: 'Иванов И.И.',
    estimatedDuration: 14,
    budget: 150000,
    currentStage: 'in_progress',
    progress: 65,
    priority: 'high',
    tags: ['фармацевтика', 'склад'],
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-29'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20'),
    qualificationObjects: []
  },
  {
    id: 'mock-2',
    description: 'Испытания холодильной камеры',
    type: 'testing',
    status: 'contract',
    contractorId: 'client-2',
    contractorName: 'ООО "Медицинский центр"',
    managerId: 'manager-1',
    managerName: 'Петров П.П.',
    estimatedDuration: 21,
    budget: 200000,
    currentStage: 'contract',
    progress: 25,
    priority: 'medium',
    tags: ['медицина', 'холодильник'],
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-22'),
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-26'),
    qualificationObjects: []
  }
];

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

type QualificationObjectRow = Database['public']['Tables']['qualification_objects']['Row'];
type QualificationObjectInsert = Database['public']['Tables']['qualification_objects']['Insert'];
type QualificationObjectUpdate = Database['public']['Tables']['qualification_objects']['Update'];

type QualificationStageRow = Database['public']['Tables']['qualification_stages']['Row'];
type QualificationStageInsert = Database['public']['Tables']['qualification_stages']['Insert'];
type QualificationStageUpdate = Database['public']['Tables']['qualification_stages']['Update'];

export class ProjectService {
  // Преобразование данных из базы в типы приложения
  private mapProjectFromDB(projectRow: ProjectRow, objects: QualificationObject[] = []): Project {
    return {
      id: projectRow.id,
      description: projectRow.description || undefined,
      type: projectRow.type,
      status: projectRow.status,
      contractorId: projectRow.client_id || '',
      contractorName: projectRow.client_name,
      managerId: projectRow.manager_id || '',
      managerName: projectRow.manager_name,
      estimatedDuration: projectRow.estimated_duration,
      budget: projectRow.budget ? Number(projectRow.budget) : undefined,
      currentStage: projectRow.current_stage || 'preparation',
      progress: projectRow.progress,
      priority: projectRow.priority,
      tags: projectRow.tags || [],
      startDate: projectRow.start_date ? new Date(projectRow.start_date) : undefined,
      endDate: projectRow.end_date ? new Date(projectRow.end_date) : undefined,
      createdAt: new Date(projectRow.created_at),
      updatedAt: new Date(projectRow.updated_at),
      qualificationObjects: objects
    };
  }

  private mapObjectFromDB(objectRow: QualificationObjectRow, stages: QualificationStage[] = []): QualificationObject {
    return {
      id: objectRow.id,
      type: objectRow.type,
      name: objectRow.name || '',
      description: objectRow.description || '',
      overallStatus: objectRow.overall_status,
      overallProgress: objectRow.overall_progress,
      currentStageId: objectRow.current_stage_id || undefined,
      technicalParameters: (objectRow.technical_parameters as any) || {},
      stages: stages,
      createdAt: new Date(objectRow.created_at),
      updatedAt: new Date(objectRow.updated_at)
    };
  }

  private mapStageFromDB(stageRow: QualificationStageRow): QualificationStage {
    return {
      id: stageRow.id,
      type: stageRow.type,
      name: stageRow.name,
      description: stageRow.description || '',
      status: stageRow.status,
      assigneeId: stageRow.assignee_id || undefined,
      assigneeName: stageRow.assignee_name || undefined,
      estimatedDuration: stageRow.estimated_duration,
      actualDuration: stageRow.actual_duration || undefined,
      startDate: stageRow.start_date ? new Date(stageRow.start_date) : undefined,
      endDate: stageRow.end_date ? new Date(stageRow.end_date) : undefined,
      plannedStartDate: stageRow.planned_start_date ? new Date(stageRow.planned_start_date) : undefined,
      plannedEndDate: stageRow.planned_end_date ? new Date(stageRow.planned_end_date) : undefined,
      order: stageRow.order_number,
      isRequired: stageRow.is_required,
      notes: stageRow.notes || undefined,
      createdAt: new Date(stageRow.created_at),
      updatedAt: new Date(stageRow.updated_at)
    };
  }

  // Преобразование данных приложения в формат базы
  private mapProjectToDB(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): ProjectInsert {
    return {
      description: project.description || null,
      type: project.type,
      status: project.status,
      client_id: project.contractorId || null,
      client_name: project.contractorName,
      manager_id: project.managerId || null,
      manager_name: project.managerName,
      estimated_duration: project.estimatedDuration,
      budget: project.budget || null,
      current_stage: project.currentStage,
      progress: project.progress,
      priority: project.priority,
      tags: project.tags,
      start_date: project.startDate?.toISOString() || null,
      end_date: project.endDate?.toISOString() || null
    };
  }

  private mapObjectToDB(object: Omit<QualificationObject, 'createdAt' | 'updatedAt'>, projectId: string): QualificationObjectInsert {
    return {
      id: object.id,
      project_id: projectId,
      type: object.type,
      name: object.name || null,
      description: object.description || null,
      overall_status: object.overallStatus,
      overall_progress: object.overallProgress,
      current_stage_id: object.currentStageId || null,
      technical_parameters: object.technicalParameters as any
    };
  }

  private mapStageToDB(stage: Omit<QualificationStage, 'createdAt' | 'updatedAt'>, objectId: string): QualificationStageInsert {
    return {
      id: stage.id,
      object_id: objectId,
      type: stage.type,
      name: stage.name,
      description: stage.description || null,
      status: stage.status,
      assignee_id: stage.assigneeId || null,
      assignee_name: stage.assigneeName || null,
      estimated_duration: stage.estimatedDuration,
      actual_duration: stage.actualDuration || null,
      start_date: stage.startDate?.toISOString() || null,
      end_date: stage.endDate?.toISOString() || null,
      planned_start_date: stage.plannedStartDate?.toISOString() || null,
      planned_end_date: stage.plannedEndDate?.toISOString() || null,
      order_number: stage.order,
      is_required: stage.isRequired,
      notes: stage.notes || null
    };
  }

  // Получение всех проектов
  async getAllProjects(): Promise<Project[]> {
    try {
      // Проверяем доступность Supabase
      const { error: healthError } = await supabase
        .from('projects')
        .select('count')
        .limit(1);

      // Если таблица не существует, возвращаем mock данные
      if (healthError && (healthError.code === 'PGRST205' || healthError.message?.includes('Could not find the table'))) {
        console.warn('Database not available, using mock data');
        return mockProjects;
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const projects: Project[] = [];

      for (const projectRow of projectsData || []) {
        // Получаем объекты квалификации для каждого проекта
        const { data: objectsData, error: objectsError } = await supabase
          .from('qualification_objects')
          .select('*')
          .eq('project_id', projectRow.id);

        if (objectsError) throw objectsError;

        const objects: QualificationObject[] = [];

        for (const objectRow of objectsData || []) {
          // Получаем этапы для каждого объекта
          const { data: stagesData, error: stagesError } = await supabase
            .from('qualification_stages')
            .select('*')
            .eq('object_id', objectRow.id)
            .order('order_number');

          if (stagesError) throw stagesError;

          const stages = (stagesData || []).map(this.mapStageFromDB);
          objects.push(this.mapObjectFromDB(objectRow, stages));
        }

        projects.push(this.mapProjectFromDB(projectRow, objects));
      }

      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      console.warn('Database error, falling back to mock data');
      return mockProjects;
    }
  }

  // Получение проекта по ID
  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        if (projectError.code === 'PGRST116') return null; // Не найден
        throw projectError;
      }

      // Получаем объекты квалификации
      const { data: objectsData, error: objectsError } = await supabase
        .from('qualification_objects')
        .select('*')
        .eq('project_id', id);

      if (objectsError) throw objectsError;

      const objects: QualificationObject[] = [];

      for (const objectRow of objectsData || []) {
        // Получаем этапы для каждого объекта
        const { data: stagesData, error: stagesError } = await supabase
          .from('qualification_stages')
          .select('*')
          .eq('object_id', objectRow.id)
          .order('order_number');

        if (stagesError) throw stagesError;

        const stages = (stagesData || []).map(this.mapStageFromDB);
        objects.push(this.mapObjectFromDB(objectRow, stages));
      }

      return this.mapProjectFromDB(projectData, objects);
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Ошибка загрузки проекта');
    }
  }

  // Поиск проекта по клиенту и типу (для проверки дублирования)
  async findProjectByContractorAndType(contractorName: string, type: Project['type']): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_name', contractorName)
        .eq('type', type)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Не найден
        throw error;
      }

      return this.mapProjectFromDB(data);
    } catch (error) {
      console.error('Error finding project by client and type:', error);
      return null;
    }
  }

  // Создание проекта
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      // Проверяем доступность базы данных
      const { error: healthError } = await supabase
        .from('projects')
        .select('count')
        .limit(1);

      if (healthError && (healthError.code === 'PGRST205' || healthError.message?.includes('Could not find the table'))) {
        // Возвращаем mock проект если БД недоступна
        const mockProject: Project = {
          ...projectData,
          id: 'mock-' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
          qualificationObjects: projectData.qualificationObjects || []
        };
        console.warn('Database not available, returning mock project');
        return mockProject;
      }

      // Создаем проект
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(this.mapProjectToDB(projectData))
        .select()
        .single();

      if (projectError) throw projectError;

      // Создаем объекты квалификации и их этапы
      const objects: QualificationObject[] = [];

      for (const objectData of projectData.qualificationObjects || []) {
        // Создаем объект квалификации
        const { data: newObject, error: objectError } = await supabase
          .from('qualification_objects')
          .insert(this.mapObjectToDB(objectData, newProject.id))
          .select()
          .single();

        if (objectError) throw objectError;

        // Создаем этапы для объекта
        const stageInserts = objectData.stages.map(stage => 
          this.mapStageToDB(stage, newObject.id)
        );

        const { data: newStages, error: stagesError } = await supabase
          .from('qualification_stages')
          .insert(stageInserts)
          .select();

        if (stagesError) throw stagesError;

        const stages = (newStages || []).map(this.mapStageFromDB);
        objects.push(this.mapObjectFromDB(newObject, stages));
      }

      return this.mapProjectFromDB(newProject, objects);
    } catch (error) {
      console.error('Error creating project:', error);
      // Возвращаем mock проект в случае ошибки
      const mockProject: Project = {
        ...projectData,
        id: 'mock-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
        qualificationObjects: projectData.qualificationObjects || []
      };
      console.warn('Database error, returning mock project');
      return mockProject;
    }
  }

  // Обновление проекта
  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    try {
      // Проверяем доступность базы данных
      const { error: healthError } = await supabase
        .from('projects')
        .select('count')
        .limit(1);

      if (healthError && (healthError.code === 'PGRST205' || healthError.message?.includes('Could not find the table'))) {
        console.warn('Database not available, update ignored');
        return;
      }

      // Обновляем основные данные проекта
      const projectUpdates: ProjectUpdate = {};
      
      if (updates.description !== undefined) projectUpdates.description = updates.description || null;
      if (updates.status !== undefined) projectUpdates.status = updates.status;
      if (updates.clientId !== undefined) projectUpdates.client_id = updates.clientId || null;
      if (updates.clientName !== undefined) projectUpdates.client_name = updates.clientName;
      if (updates.managerId !== undefined) projectUpdates.manager_id = updates.managerId || null;
      if (updates.managerName !== undefined) projectUpdates.manager_name = updates.managerName;
      if (updates.estimatedDuration !== undefined) projectUpdates.estimated_duration = updates.estimatedDuration;
      if (updates.budget !== undefined) projectUpdates.budget = updates.budget || null;
      if (updates.currentStage !== undefined) projectUpdates.current_stage = updates.currentStage;
      if (updates.progress !== undefined) projectUpdates.progress = updates.progress;
      if (updates.priority !== undefined) projectUpdates.priority = updates.priority;
      if (updates.tags !== undefined) projectUpdates.tags = updates.tags;
      if (updates.startDate !== undefined) projectUpdates.start_date = updates.startDate?.toISOString() || null;
      if (updates.endDate !== undefined) projectUpdates.end_date = updates.endDate?.toISOString() || null;

      if (Object.keys(projectUpdates).length > 0) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectUpdates)
          .eq('id', id);

        if (projectError) throw projectError;
      }

      // Обновляем объекты квалификации если они переданы
      if (updates.qualificationObjects) {
        // Получаем существующие объекты
        const { data: existingObjects } = await supabase
          .from('qualification_objects')
          .select('id')
          .eq('project_id', id);

        const existingObjectIds = new Set((existingObjects || []).map(obj => obj.id));
        const newObjectIds = new Set(updates.qualificationObjects.map(obj => obj.id));

        // Удаляем объекты, которых нет в новом списке
        const objectsToDelete = Array.from(existingObjectIds).filter(id => !newObjectIds.has(id));
        if (objectsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('qualification_objects')
            .delete()
            .in('id', objectsToDelete);

          if (deleteError) throw deleteError;
        }

        // Обновляем или создаем объекты
        for (const objectData of updates.qualificationObjects) {
          if (existingObjectIds.has(objectData.id)) {
            // Обновляем существующий объект
            await this.updateQualificationObject(objectData.id, objectData);
          } else {
            // Создаем новый объект
            await this.createQualificationObject(objectData, id);
          }
        }
      }
    } catch (error) {
      console.error('Error updating project:', error);
      console.warn('Database error, update ignored');
    }
  }

  // Удаление проекта
  async deleteProject(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Ошибка удаления проекта');
    }
  }

  // Создание объекта квалификации
  async createQualificationObject(objectData: QualificationObject, projectId: string): Promise<QualificationObject> {
    try {
      // Создаем объект квалификации
      const { data: newObject, error: objectError } = await supabase
        .from('qualification_objects')
        .insert(this.mapObjectToDB(objectData, projectId))
        .select()
        .single();

      if (objectError) throw objectError;

      // Создаем этапы для объекта
      const stageInserts = objectData.stages.map(stage => 
        this.mapStageToDB(stage, newObject.id)
      );

      const { data: newStages, error: stagesError } = await supabase
        .from('qualification_stages')
        .insert(stageInserts)
        .select();

      if (stagesError) throw stagesError;

      const stages = (newStages || []).map(this.mapStageFromDB);
      return this.mapObjectFromDB(newObject, stages);
    } catch (error) {
      console.error('Error creating qualification object:', error);
      throw new Error('Ошибка создания объекта квалификации');
    }
  }

  // Обновление объекта квалификации
  async updateQualificationObject(objectId: string, updates: Partial<QualificationObject>): Promise<void> {
    try {
      // Обновляем основные данные объекта
      const objectUpdates: QualificationObjectUpdate = {};
      
      if (updates.type !== undefined) objectUpdates.type = updates.type;
      if (updates.name !== undefined) objectUpdates.name = updates.name || null;
      if (updates.description !== undefined) objectUpdates.description = updates.description || null;
      if (updates.overallStatus !== undefined) objectUpdates.overall_status = updates.overallStatus;
      if (updates.overallProgress !== undefined) objectUpdates.overall_progress = updates.overallProgress;
      if (updates.currentStageId !== undefined) objectUpdates.current_stage_id = updates.currentStageId || null;
      if (updates.technicalParameters !== undefined) objectUpdates.technical_parameters = updates.technicalParameters as any;

      if (Object.keys(objectUpdates).length > 0) {
        const { error: objectError } = await supabase
          .from('qualification_objects')
          .update(objectUpdates)
          .eq('id', objectId);

        if (objectError) throw objectError;
      }

      // Обновляем этапы если они переданы
      if (updates.stages) {
        // Получаем существующие этапы
        const { data: existingStages } = await supabase
          .from('qualification_stages')
          .select('id')
          .eq('object_id', objectId);

        const existingStageIds = new Set((existingStages || []).map(stage => stage.id));
        const newStageIds = new Set(updates.stages.map(stage => stage.id));

        // Удаляем этапы, которых нет в новом списке
        const stagesToDelete = Array.from(existingStageIds).filter(id => !newStageIds.has(id));
        if (stagesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('qualification_stages')
            .delete()
            .in('id', stagesToDelete);

          if (deleteError) throw deleteError;
        }

        // Обновляем или создаем этапы
        for (const stageData of updates.stages) {
          if (existingStageIds.has(stageData.id)) {
            // Обновляем существующий этап
            await this.updateQualificationStage(stageData.id, stageData);
          } else {
            // Создаем новый этап
            const { error: stageError } = await supabase
              .from('qualification_stages')
              .insert(this.mapStageToDB(stageData, objectId));

            if (stageError) throw stageError;
          }
        }
      }
    } catch (error) {
      console.error('Error updating qualification object:', error);
      throw new Error('Ошибка обновления объекта квалификации');
    }
  }

  // Обновление этапа квалификации
  async updateQualificationStage(stageId: string, updates: Partial<QualificationStage>): Promise<void> {
    try {
      const stageUpdates: QualificationStageUpdate = {};
      
      if (updates.status !== undefined) stageUpdates.status = updates.status;
      if (updates.assigneeId !== undefined) stageUpdates.assignee_id = updates.assigneeId || null;
      if (updates.assigneeName !== undefined) stageUpdates.assignee_name = updates.assigneeName || null;
      if (updates.estimatedDuration !== undefined) stageUpdates.estimated_duration = updates.estimatedDuration;
      if (updates.actualDuration !== undefined) stageUpdates.actual_duration = updates.actualDuration || null;
      if (updates.startDate !== undefined) stageUpdates.start_date = updates.startDate?.toISOString() || null;
      if (updates.endDate !== undefined) stageUpdates.end_date = updates.endDate?.toISOString() || null;
      if (updates.plannedStartDate !== undefined) stageUpdates.planned_start_date = updates.plannedStartDate?.toISOString() || null;
      if (updates.plannedEndDate !== undefined) stageUpdates.planned_end_date = updates.plannedEndDate?.toISOString() || null;
      if (updates.notes !== undefined) stageUpdates.notes = updates.notes || null;

      const { error } = await supabase
        .from('qualification_stages')
        .update(stageUpdates)
        .eq('id', stageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating qualification stage:', error);
      throw new Error('Ошибка обновления этапа квалификации');
    }
  }

  // Добавление активности проекта
  async addProjectActivity(activity: {
    projectId: string;
    userId: string;
    userName: string;
    action: string;
    description: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_activities')
        .insert({
          project_id: activity.projectId,
          user_id: activity.userId,
          user_name: activity.userName,
          action: activity.action,
          description: activity.description,
          metadata: activity.metadata || {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding project activity:', error);
      throw new Error('Ошибка добавления активности проекта');
    }
  }

  // Получение активностей проекта
  async getProjectActivities(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      return (data || []).map(activity => ({
        id: activity.id,
        projectId: activity.project_id,
        userId: activity.user_id,
        userName: activity.user_name,
        action: activity.action,
        description: activity.description,
        metadata: activity.metadata,
        timestamp: new Date(activity.timestamp)
      }));
    } catch (error) {
      console.error('Error fetching project activities:', error);
      throw new Error('Ошибка загрузки активностей проекта');
    }
  }
}

export const projectService = new ProjectService();