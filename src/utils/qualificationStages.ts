import { QualificationStage, QualificationStageType } from '../types/Project';

export interface StageTemplate {
  type: QualificationStageType;
  name: string;
  description: string;
  estimatedDuration: number;
  order: number;
  isRequired: boolean;
}

// Шаблоны этапов для объектов квалификации
export const QUALIFICATION_STAGE_TEMPLATES: StageTemplate[] = [
  {
    type: 'documentation_collection',
    name: 'Сбор документации',
    description: 'Сбор необходимой технической документации и разрешений',
    estimatedDuration: 2,
    order: 1,
    isRequired: true
  },
  {
    type: 'protocol_preparation',
    name: 'Подготовка протокола',
    description: 'Разработка протокола испытаний и методики проведения',
    estimatedDuration: 2,
    order: 2,
    isRequired: true
  },
  {
    type: 'equipment_setup',
    name: 'Подготовка и установка оборудования',
    description: 'Подготовка измерительного оборудования и его размещение',
    estimatedDuration: 2,
    order: 3,
    isRequired: true
  },
  {
    type: 'testing_execution',
    name: 'Проведение испытаний',
    description: 'Выполнение испытаний согласно утвержденному протоколу',
    estimatedDuration: 7,
    order: 4,
    isRequired: true
  },
  {
    type: 'data_extraction',
    name: 'Снятие данных',
    description: 'Извлечение и первичная обработка данных измерений',
    estimatedDuration: 1,
    order: 5,
    isRequired: true
  },
  {
    type: 'report_preparation',
    name: 'Подготовка отчета',
    description: 'Анализ данных и подготовка технического отчета',
    estimatedDuration: 5,
    order: 6,
    isRequired: true
  },
  {
    type: 'report_approval',
    name: 'Согласование отчета',
    description: 'Согласование отчета с заказчиком и внесение правок',
    estimatedDuration: 2,
    order: 7,
    isRequired: true
  },
  {
    type: 'documentation_finalization',
    name: 'Подготовка документации',
    description: 'Финальная подготовка и передача документации',
    estimatedDuration: 1,
    order: 8,
    isRequired: true
  },
  {
    type: 'closed',
    name: 'Закрыт',
    description: 'Этап завершен',
    estimatedDuration: 0,
    order: 9,
    isRequired: false
  },
  {
    type: 'paused',
    name: 'Приостановлен',
    description: 'Этап временно приостановлен',
    estimatedDuration: 0, // Устанавливается пользователем
    order: 10,
    isRequired: false
  }
];

/**
 * Создание этапов для объекта квалификации на основе шаблонов
 */
export function createQualificationStages(objectId: string, startDate?: Date): QualificationStage[] {
  const now = new Date();
  const baseStartDate = startDate || now;
  
  return QUALIFICATION_STAGE_TEMPLATES
    .filter(template => template.type !== 'paused') // Все этапы кроме "Пауза"
    .map((template, index) => {
      const stage: QualificationStage = {
        id: `${objectId}_stage_${template.type}_${Date.now()}_${index}`,
        type: template.type,
        name: template.name,
        description: template.description,
        status: index === 0 ? 'pending' : 'pending', // Первый этап готов к выполнению
        estimatedDuration: template.estimatedDuration,
        order: template.order,
        isRequired: template.isRequired,
        createdAt: now,
        updatedAt: now
      };

      // Рассчитываем плановые даты начиная от базовой даты
      if (index === 0) {
        stage.plannedStartDate = new Date(baseStartDate);
        stage.plannedEndDate = new Date(baseStartDate.getTime() + template.estimatedDuration * 24 * 60 * 60 * 1000);
      } else {
        // Каждый следующий этап начинается после завершения предыдущего (исключая "Пауза")
        const relevantTemplates = QUALIFICATION_STAGE_TEMPLATES.filter(t => t.type !== 'paused');
        const currentTemplateIndex = relevantTemplates.findIndex(t => t.type === template.type);
        const prevDuration = relevantTemplates.slice(0, currentTemplateIndex).reduce((sum, s) => sum + s.estimatedDuration, 0);
        
        stage.plannedStartDate = new Date(baseStartDate.getTime() + prevDuration * 24 * 60 * 60 * 1000);
        stage.plannedEndDate = new Date(baseStartDate.getTime() + (prevDuration + template.estimatedDuration) * 24 * 60 * 60 * 1000);
      }

      return stage;
    });
}

/**
 * Получение следующего этапа для выполнения
 */
export function getNextStage(stages: QualificationStage[]): QualificationStage | null {
  const sortedStages = stages
    .filter(stage => stage.isRequired)
    .sort((a, b) => a.order - b.order);
  
  return sortedStages.find(stage => stage.status === 'pending') || null;
}

/**
 * Расчет общего прогресса объекта квалификации
 */
export function calculateObjectProgress(stages: QualificationStage[]): number {
  const requiredStages = stages.filter(stage => stage.isRequired);
  if (requiredStages.length === 0) return 0;
  
  const completedStages = requiredStages.filter(stage => stage.status === 'completed');
  return Math.round((completedStages.length / requiredStages.length) * 100);
}

/**
 * Определение общего статуса объекта квалификации
 */
export function calculateObjectStatus(stages: QualificationStage[]): QualificationObject['overallStatus'] {
  const requiredStages = stages.filter(stage => stage.isRequired);
  
  if (requiredStages.length === 0) return 'not_started';
  
  const hasStarted = requiredStages.some(stage => stage.status !== 'pending');
  const allCompleted = requiredStages.every(stage => stage.status === 'completed');
  const hasPaused = requiredStages.some(stage => stage.status === 'paused');
  
  if (allCompleted) return 'completed';
  if (hasPaused) return 'paused';
  if (hasStarted) return 'in_progress';
  
  return 'not_started';
}

/**
 * Получение названия статуса этапа
 */
export function getStageStatusText(status: QualificationStageStatus): string {
  switch (status) {
    case 'pending': return 'Ожидает';
    case 'in_progress': return 'В работе';
    case 'completed': return 'Завершен';
    case 'paused': return 'Приостановлен';
    default: return status;
  }
}

/**
 * Получение цвета статуса этапа
 */
export function getStageStatusColor(status: QualificationStageStatus): string {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'paused': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}