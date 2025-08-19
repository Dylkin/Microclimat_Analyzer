export type ProjectStatus = 'draft' | 'contract' | 'in_progress' | 'paused' | 'closed';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

export type TaskType = 
  | 'contract_preparation' 
  | 'quote_creation' 
  | 'contract_signing' 
  | 'payment_control'
  | 'logger_placement' 
  | 'video_recording' 
  | 'data_extraction'
  | 'report_preparation' 
  | 'report_approval' 
  | 'report_delivery';

export type ProjectType = 'mapping';

export type QualificationObjectType = 'room' | 'automobile' | 'refrigerator_chamber' | 'refrigerator' | 'freezer' | 'thermocontainer';

export type QualificationStageType = 
  | 'documentation_collection'
  | 'protocol_preparation' 
  | 'equipment_setup'
  | 'testing_execution'
  | 'data_extraction'
  | 'report_preparation'
  | 'report_approval'
  | 'documentation_finalization'
  | 'closed'
  | 'paused';

export type QualificationStageStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

export interface QualificationStage {
  id: string;
  type: QualificationStageType;
  name: string;
  description: string;
  status: QualificationStageStatus;
  assigneeId?: string;
  assigneeName?: string;
  estimatedDuration: number; // в днях
  actualDuration?: number; // в днях
  startDate?: Date;
  endDate?: Date;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  order: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface QualificationObject {
  id: string;
  type: QualificationObjectType;
  name: string;
  description?: string;
  stages: QualificationStage[];
  currentStageId?: string;
  overallStatus: 'not_started' | 'in_progress' | 'completed' | 'paused';
  overallProgress: number; // 0-100
  technicalParameters: {
    area?: number; // площадь в м²
    volume?: number; // объем в м³
    loggerCount?: number; // количество логгеров
    testingDuration?: number; // длительность испытаний в часах
    temperatureRange?: {
      min: number;
      max: number;
    };
    humidityRange?: {
      min: number;
      max: number;
    };
    specialRequirements?: string[];
    location?: string; // местоположение объекта
    capacity?: number; // вместимость (для транспорта, камер)
    // Общие поля
    climateSystemName?: string; // Название климатической установки
    
    // Для помещений, холодильных камер
    inventoryNumber?: string; // Инвентарный номер
    
    // Для холодильников, морозильников, термоконтейнеров
    serialNumber?: string; // Серийный номер
    
    // Для автомобилей
    vin?: string; // VIN номер
    registrationNumber?: string; // Регистрационный номер
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  contractorId: string;
  contractorName: string;
  managerId: string;
  managerName: string;
  qualificationObjects: QualificationObject[];
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  estimatedDuration: number; // в днях
  budget?: number;
  currentStage: string;
  progress: number; // 0-100
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencies: string[]; // IDs других задач
  estimatedHours: number;
  actualHours?: number;
  stage: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  order: number;
  requiredRoles: string[];
  estimatedDuration: number;
  tasks: TaskType[];
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  stages: ProjectStage[];
  defaultTasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: 'contract' | 'quote' | 'plan' | 'protocol' | 'report' | 'video' | 'other';
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
  version: number;
  isActive: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  type: 'deadline' | 'approval_required' | 'task_assigned' | 'project_update' | 'payment_due';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}