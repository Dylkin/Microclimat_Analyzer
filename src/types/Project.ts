export type ProjectStatus = 'draft' | 'preparation' | 'testing' | 'reporting' | 'completed' | 'cancelled' | 'on_hold';

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

export type ProjectType = 'mapping' | 'testing' | 'full_qualification';

export interface Project {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
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
  metadata: {
    roomArea?: number;
    loggerCount?: number;
    testingDuration?: number;
    specialRequirements?: string[];
  };
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