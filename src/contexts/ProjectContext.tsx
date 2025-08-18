import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, ProjectActivity, ProjectDocument, Notification, ProjectTemplate } from '../types/Project';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  activities: ProjectActivity[];
  documents: ProjectDocument[];
  notifications: Notification[];
  templates: ProjectTemplate[];
  
  // Project methods
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => Project | undefined;
  
  // Task methods
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  assignTask: (taskId: string, assigneeId: string) => Promise<void>;
  
  // Document methods
  uploadDocument: (projectId: string, file: File, type: ProjectDocument['type']) => Promise<ProjectDocument>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Activity methods
  addActivity: (activity: Omit<ProjectActivity, 'id' | 'timestamp'>) => Promise<void>;
  
  // Notification methods
  markNotificationAsRead: (id: string) => Promise<void>;
  getUnreadNotificationsCount: () => number;
  
  // Utility methods
  getProjectsByUser: (userId: string) => Project[];
  getTasksByUser: (userId: string) => Task[];
  getOverdueTasks: () => Task[];
  getProjectProgress: (projectId: string) => number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

// Шаблоны проектов
const defaultTemplates: ProjectTemplate[] = [
  {
    id: 'mapping-template',
    name: 'Картирование помещений',
    description: 'Стандартный процесс картирования температурных условий',
    type: 'mapping',
    stages: [
      {
        id: 'preparation',
        name: 'Подготовительный этап',
        description: 'Подготовка документов и планирование',
        order: 1,
        requiredRoles: ['manager', 'administrator'],
        estimatedDuration: 5,
        tasks: ['contract_preparation', 'quote_creation', 'contract_signing'],
        isCompleted: false
      },
      {
        id: 'testing',
        name: 'Проведение испытаний',
        description: 'Размещение логгеров и сбор данных',
        order: 2,
        requiredRoles: ['specialist', 'administrator'],
        estimatedDuration: 7,
        tasks: ['logger_placement', 'video_recording', 'data_extraction'],
        isCompleted: false
      },
      {
        id: 'reporting',
        name: 'Отчетность',
        description: 'Подготовка и согласование отчета',
        order: 3,
        requiredRoles: ['specialist', 'manager', 'administrator'],
        estimatedDuration: 3,
        tasks: ['report_preparation', 'report_approval', 'report_delivery'],
        isCompleted: false
      }
    ],
    defaultTasks: []
  },
  {
    id: 'testing-template',
    name: 'Испытания оборудования',
    description: 'Процесс испытаний климатического оборудования',
    type: 'testing',
    stages: [
      {
        id: 'preparation',
        name: 'Подготовительный этап',
        description: 'Подготовка к испытаниям',
        order: 1,
        requiredRoles: ['manager', 'administrator'],
        estimatedDuration: 3,
        tasks: ['contract_preparation', 'quote_creation'],
        isCompleted: false
      },
      {
        id: 'testing',
        name: 'Испытания',
        description: 'Проведение испытаний',
        order: 2,
        requiredRoles: ['specialist', 'administrator'],
        estimatedDuration: 10,
        tasks: ['logger_placement', 'data_extraction'],
        isCompleted: false
      },
      {
        id: 'reporting',
        name: 'Отчетность',
        description: 'Формирование отчета',
        order: 3,
        requiredRoles: ['specialist', 'manager'],
        estimatedDuration: 5,
        tasks: ['report_preparation', 'report_approval'],
        isCompleted: false
      }
    ],
    defaultTasks: []
  }
];

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates] = useState<ProjectTemplate[]>(defaultTemplates);

  // Загрузка данных при инициализации
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Загрузка из localStorage (в реальном приложении - из API)
    const savedProjects = localStorage.getItem('projects');
    const savedTasks = localStorage.getItem('tasks');
    const savedActivities = localStorage.getItem('activities');
    const savedDocuments = localStorage.getItem('documents');
    const savedNotifications = localStorage.getItem('notifications');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedActivities) setActivities(JSON.parse(savedActivities));
    if (savedDocuments) setDocuments(JSON.parse(savedDocuments));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  };

  const saveData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Project methods
  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      currentStage: 'preparation'
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveData('projects', updatedProjects);

    // Создаем начальные задачи на основе шаблона
    const template = templates.find(t => t.type === projectData.type);
    if (template) {
      const initialTasks = template.stages[0].tasks.map(taskType => ({
        projectId: newProject.id,
        title: getTaskTitle(taskType),
        description: getTaskDescription(taskType),
        type: taskType,
        status: 'pending' as const,
        priority: 'medium' as const,
        dependencies: [],
        estimatedHours: getTaskEstimatedHours(taskType),
        stage: 'preparation',
        comments: [],
        attachments: []
      }));

      for (const taskData of initialTasks) {
        await createTask(taskData);
      }
    }

    await addActivity({
      projectId: newProject.id,
      userId: user?.id || '',
      userName: user?.fullName || '',
      action: 'project_created',
      description: `Создан проект "${newProject.title}"`
    });

    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
    const updatedProjects = projects.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    );
    setProjects(updatedProjects);
    saveData('projects', updatedProjects);

    await addActivity({
      projectId: id,
      userId: user?.id || '',
      userName: user?.fullName || '',
      action: 'project_updated',
      description: `Обновлен проект`
    });
  };

  const deleteProject = async (id: string): Promise<void> => {
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    saveData('projects', updatedProjects);

    // Удаляем связанные задачи
    const updatedTasks = tasks.filter(t => t.projectId !== id);
    setTasks(updatedTasks);
    saveData('tasks', updatedTasks);
  };

  const getProject = (id: string): Project | undefined => {
    return projects.find(p => p.id === id);
  };

  // Task methods
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    saveData('tasks', updatedTasks);

    await addActivity({
      projectId: newTask.projectId,
      userId: user?.id || '',
      userName: user?.fullName || '',
      action: 'task_created',
      description: `Создана задача "${newTask.title}"`
    });

    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    const updatedTasks = tasks.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    );
    setTasks(updatedTasks);
    saveData('tasks', updatedTasks);

    const task = tasks.find(t => t.id === id);
    if (task) {
      await addActivity({
        projectId: task.projectId,
        userId: user?.id || '',
        userName: user?.fullName || '',
        action: 'task_updated',
        description: `Обновлена задача "${task.title}"`
      });

      // Обновляем прогресс проекта
      updateProjectProgress(task.projectId);
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const task = tasks.find(t => t.id === id);
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveData('tasks', updatedTasks);

    if (task) {
      await addActivity({
        projectId: task.projectId,
        userId: user?.id || '',
        userName: user?.fullName || '',
        action: 'task_deleted',
        description: `Удалена задача "${task.title}"`
      });
    }
  };

  const assignTask = async (taskId: string, assigneeId: string): Promise<void> => {
    const assignee = user; // В реальном приложении получать из API
    await updateTask(taskId, {
      assigneeId,
      assigneeName: assignee?.fullName || 'Unknown'
    });
  };

  // Document methods
  const uploadDocument = async (projectId: string, file: File, type: ProjectDocument['type']): Promise<ProjectDocument> => {
    // В реальном приложении загружать файл на сервер
    const newDocument: ProjectDocument = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      projectId,
      name: file.name,
      type,
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: user?.fullName || '',
      uploadedAt: new Date(),
      url: URL.createObjectURL(file), // Временный URL
      version: 1,
      isActive: true
    };

    const updatedDocuments = [...documents, newDocument];
    setDocuments(updatedDocuments);
    saveData('documents', updatedDocuments);

    await addActivity({
      projectId,
      userId: user?.id || '',
      userName: user?.fullName || '',
      action: 'document_uploaded',
      description: `Загружен документ "${file.name}"`
    });

    return newDocument;
  };

  const deleteDocument = async (id: string): Promise<void> => {
    const document = documents.find(d => d.id === id);
    const updatedDocuments = documents.filter(d => d.id !== id);
    setDocuments(updatedDocuments);
    saveData('documents', updatedDocuments);

    if (document) {
      await addActivity({
        projectId: document.projectId,
        userId: user?.id || '',
        userName: user?.fullName || '',
        action: 'document_deleted',
        description: `Удален документ "${document.name}"`
      });
    }
  };

  // Activity methods
  const addActivity = async (activity: Omit<ProjectActivity, 'id' | 'timestamp'>): Promise<void> => {
    const newActivity: ProjectActivity = {
      ...activity,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    const updatedActivities = [...activities, newActivity];
    setActivities(updatedActivities);
    saveData('activities', updatedActivities);
  };

  // Notification methods
  const markNotificationAsRead = async (id: string): Promise<void> => {
    const updatedNotifications = notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    setNotifications(updatedNotifications);
    saveData('notifications', updatedNotifications);
  };

  const getUnreadNotificationsCount = (): number => {
    return notifications.filter(n => !n.isRead && n.userId === user?.id).length;
  };

  // Utility methods
  const getProjectsByUser = (userId: string): Project[] => {
    return projects.filter(p => p.managerId === userId || p.clientId === userId);
  };

  const getTasksByUser = (userId: string): Task[] => {
    return tasks.filter(t => t.assigneeId === userId);
  };

  const getOverdueTasks = (): Task[] => {
    const now = new Date();
    return tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'completed' && 
      t.status !== 'cancelled'
    );
  };

  const getProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    
    const completedTasks = projectTasks.filter(t => t.status === 'completed');
    return Math.round((completedTasks.length / projectTasks.length) * 100);
  };

  const updateProjectProgress = (projectId: string) => {
    const progress = getProjectProgress(projectId);
    updateProject(projectId, { progress });
  };

  // Helper functions
  const getTaskTitle = (type: string, clientName?: string): string => {
    const titles: Record<string, string> = {
      contract_preparation: `Подготовка договора${clientName ? ` с ${clientName}` : ''}`,
      quote_creation: `Создание КП${clientName ? ` для ${clientName}` : ''}`,
      contract_signing: `Подписание договора${clientName ? ` с ${clientName}` : ''}`,
      payment_control: 'Контроль оплаты',
      logger_placement: 'Расстановка логгеров',
      video_recording: 'Видеофиксация',
      data_extraction: 'Выгрузка данных',
      report_preparation: 'Подготовка отчета',
      report_approval: 'Согласование отчета',
      report_delivery: 'Сдача отчета'
    };
    return titles[type] || type;
  };

  const getTaskDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      contract_preparation: 'Подготовка договорной документации',
      quote_creation: 'Формирование коммерческого предложения',
      contract_signing: 'Подписание договора с заказчиком',
      payment_control: 'Контроль поступления оплаты',
      logger_placement: 'Размещение логгеров в помещении',
      video_recording: 'Видеофиксация процесса испытаний',
      data_extraction: 'Выгрузка и обработка данных',
      report_preparation: 'Подготовка технического отчета',
      report_approval: 'Согласование отчета с заказчиком',
      report_delivery: 'Передача готового отчета'
    };
    return descriptions[type] || '';
  };

  const getTaskEstimatedHours = (type: string): number => {
    const hours: Record<string, number> = {
      contract_preparation: 4,
      quote_creation: 2,
      contract_signing: 1,
      payment_control: 1,
      logger_placement: 8,
      video_recording: 2,
      data_extraction: 4,
      report_preparation: 16,
      report_approval: 4,
      report_delivery: 2
    };
    return hours[type] || 4;
  };

  const value = {
    projects,
    tasks,
    activities,
    documents,
    notifications,
    templates,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    uploadDocument,
    deleteDocument,
    addActivity,
    markNotificationAsRead,
    getUnreadNotificationsCount,
    getProjectsByUser,
    getTasksByUser,
    getOverdueTasks,
    getProjectProgress
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};