import { apiClient } from './apiClient';
import {
  Project,
  ProjectQualificationObject,
  ProjectStageAssignment,
  ProjectStatus,
  CreateProjectData,
  UpdateProjectData,
} from '../types/Project';

type ProjectDto = {
  id: string;
  name: string;
  description?: string | null;
  contractorId?: string | null;
  contractor_id?: string | null;
  contractorName?: string | null;
  contract_number?: string | null;
  contractNumber?: string | null;
  contract_date?: string | null;
  contractDate?: string | null;
  status: ProjectStatus;
  created_by?: string | null;
  createdBy?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  qualificationObjects?: Array<{
    id: string;
    name?: string;
    objectType?: string;
    qualificationObjectId?: string;
    projectId?: string;
    createdAt?: string;
  }>;
  stageAssignments?: Array<{
    id: string;
    projectId: string;
    stage: ProjectStatus;
    assignedUserId?: string;
    assignedUserName?: string;
    assignedAt?: string;
    completedAt?: string | null;
    notes?: string | null;
    createdAt?: string;
  }>;
};

const toDate = (value?: string | null) =>
  value ? new Date(value) : undefined;

const mapQualificationObjects = (
  items?: ProjectDto['qualificationObjects'],
): ProjectQualificationObject[] =>
  (items || []).map((item) => ({
    id: item.id,
    projectId: item.projectId || '',
    qualificationObjectId:
      item.qualificationObjectId || item.id,
    qualificationObjectName: item.name,
    qualificationObjectType: item.objectType,
    createdAt: toDate(item.createdAt) || new Date(),
  }));

const mapStageAssignments = (
  items?: ProjectDto['stageAssignments'],
): ProjectStageAssignment[] =>
  (items || []).map((item) => ({
    id: item.id,
    projectId: item.projectId,
    stage: item.stage,
    assignedUserId: item.assignedUserId,
    assignedUserName: item.assignedUserName,
    assignedAt: toDate(item.assignedAt) || new Date(),
    completedAt: toDate(item.completedAt || undefined),
    notes: item.notes || undefined,
    createdAt: toDate(item.createdAt) || new Date(),
  }));

const mapProject = (dto: ProjectDto): Project => ({
  id: dto.id,
  name: dto.name,
  description: dto.description || undefined,
  contractorId: dto.contractorId || dto.contractor_id || '',
  contractorName: dto.contractorName || undefined,
  contractNumber: dto.contractNumber || dto.contract_number || undefined,
  contractDate: toDate(dto.contractDate || dto.contract_date),
  status: dto.status,
  createdBy: dto.createdBy || dto.created_by || undefined,
  createdAt: toDate(dto.createdAt || dto.created_at) || new Date(),
  updatedAt: toDate(dto.updatedAt || dto.updated_at) || new Date(),
  qualificationObjects: mapQualificationObjects(dto.qualificationObjects),
  stageAssignments: mapStageAssignments(dto.stageAssignments),
});

class ProjectService {
  isAvailable(): boolean {
    return true;
  }

  async getAllProjects(): Promise<Project[]> {
    const data = await apiClient.get<ProjectDto[]>('/projects');
    return data.map(mapProject);
  }

  async getProjectById(id: string): Promise<Project> {
    const data = await apiClient.get<ProjectDto>(`/projects/${id}`);
    return mapProject(data);
  }

  async addProject(project: CreateProjectData, userId?: string): Promise<Project> {
    const payload = {
      name: project.name,
      description: project.description,
      contractorId: project.contractorId,
      qualificationObjectIds: project.qualificationObjectIds,
      stageAssignments: project.stageAssignments,
      createdBy: userId,
    };

    const data = await apiClient.post<ProjectDto>('/projects', payload);
    return mapProject(data);
  }

  async updateProject(id: string, updates: UpdateProjectData): Promise<Project> {
    const payload: Record<string, unknown> = {};
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }
    if (updates.contractNumber !== undefined) {
      payload.contractNumber = updates.contractNumber;
    }
    if (updates.contractDate !== undefined) {
      payload.contractDate = updates.contractDate.toISOString();
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.qualificationObjectIds !== undefined) {
      payload.qualificationObjectIds = updates.qualificationObjectIds;
    }

    const data = await apiClient.put<ProjectDto>(`/projects/${id}`, payload);
    return mapProject(data);
  }

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  }

  async updateStageAssignment(): Promise<void> {
    throw new Error(
      'Обновление назначений этапов пока не поддерживается новым API',
    );
  }
}

export const projectService = new ProjectService();

