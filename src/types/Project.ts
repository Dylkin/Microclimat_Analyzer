export type ProjectStatus = 
  | 'contract_negotiation'
  | 'testing_execution'
  | 'creating_report'
  | 'report_approval'
  | 'report_printing'
  | 'completed';

export interface Project {
  id: string;
  name: string;
  description?: string;
  contractorId: string;
  contractorName?: string;
  contractNumber?: string;
  contractDate?: Date;
  status: ProjectStatus;
  createdBy?: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  qualificationObjects: ProjectQualificationObject[];
  stageAssignments: ProjectStageAssignment[];
}

export interface ProjectQualificationObject {
  id: string;
  projectId: string;
  qualificationObjectId: string;
  qualificationObjectName?: string;
  qualificationObjectType?: string;
  createdAt: Date;
}

export interface ProjectStageAssignment {
  id: string;
  projectId: string;
  stage: ProjectStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedAt: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateProjectData {
  name?: string;
  description?: string;
  contractorId: string;
  qualificationObjectIds: string[];
  stageAssignments?: {
    stage: ProjectStatus;
    assignedUserId?: string;
    notes?: string;
  }[];
}

export interface UpdateProjectData {
  description?: string;
  contractNumber?: string;
  contractDate?: Date;
  status?: ProjectStatus;
  qualificationObjectIds?: string[];
}

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  'contract_negotiation': 'Согласование договора',
  'testing_execution': 'Проведение испытаний',
  'creating_report': 'Создание отчета',
  'report_approval': 'Согласование отчета',
  'report_printing': 'Печать отчета',
  'completed': 'Завершен'
};

export const ProjectStatusColors: Record<ProjectStatus, string> = {
  'contract_negotiation': 'bg-yellow-100 text-yellow-800',
  'testing_execution': 'bg-purple-100 text-purple-800',
  'creating_report': 'bg-orange-100 text-orange-800',
  'report_approval': 'bg-indigo-100 text-indigo-800',
  'report_printing': 'bg-green-100 text-green-800',
  'completed': 'bg-gray-100 text-gray-800'
};