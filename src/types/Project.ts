export type ProjectStatus = 
  | 'documents_submission'
  | 'contract_negotiation'
  | 'testing_execution'
  | 'report_preparation'
  | 'report_approval'
  | 'report_printing'
  | 'completed'
  | 'not_suitable';

export type ProjectType = 'qualification' | 'sale' | 'other';

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
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
  items?: ProjectItem[];
}

export interface ProjectItem {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  declaredPrice: number;
  supplierId?: string;
  supplierName?: string;
  supplierPrice?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
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
  type?: ProjectType;
  contractorId: string;
  tenderLink?: string;
  tenderDate?: Date;
  qualificationObjectIds: string[];
  items?: Omit<ProjectItem, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
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
  'documents_submission': 'Подача документов',
  'contract_negotiation': 'Согласование договора',
  'testing_execution': 'Проведение испытаний',
  'report_preparation': 'Подготовка отчета',
  'report_approval': 'Согласование отчета',
  'report_printing': 'Печать отчета',
  'completed': 'Завершен',
  'not_suitable': 'Не подходит'
};

export const ProjectStatusColors: Record<ProjectStatus, string> = {
  'documents_submission': 'bg-blue-100 text-blue-800',
  'contract_negotiation': 'bg-yellow-100 text-yellow-800',
  'testing_execution': 'bg-purple-100 text-purple-800',
  'report_preparation': 'bg-orange-100 text-orange-800',
  'report_approval': 'bg-indigo-100 text-indigo-800',
  'report_printing': 'bg-green-100 text-green-800',
  'completed': 'bg-gray-100 text-gray-800',
  'not_suitable': 'bg-red-100 text-red-800'
};

export const ProjectTypeLabels: Record<ProjectType, string> = {
  'qualification': 'Квалификация',
  'sale': 'Продажа',
  'other': 'Другое'
};