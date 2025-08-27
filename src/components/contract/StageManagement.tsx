import React, { useState } from 'react';
import { CheckCircle, Clock, User, Calendar, FileText, Save, X, Edit2 } from 'lucide-react';
import { Project, ProjectStatus, ProjectStatusLabels } from '../../types/Project';
import { User as UserType } from '../../types/User';
import { projectService } from '../../utils/projectService';

interface StageManagementProps {
  project: Project;
  users: UserType[];
  currentUser: UserType;
  onProjectUpdate: (updatedProject: Project) => void;
}

interface StageInfo {
  stage: ProjectStatus;
  title: string;
  description: string;
  responsibleRole: string;
  duration: string;
  dependencies?: ProjectStatus[];
}

const STAGES: StageInfo[] = [
  {
    stage: 'contract_negotiation',
    title: 'Согласование договора',
    description: 'Согласование объемов работ и подготовка коммерческого предложения',
    responsibleRole: 'Менеджер',
    duration: '3 дня'
  },
  {
    stage: 'protocol_preparation',
    title: 'Подготовка протокола',
    description: 'Подготовка протокола испытаний и методики проведения',
    responsibleRole: 'Специалист',
    duration: '1 день',
    dependencies: ['contract_negotiation']
  },
  {
    stage: 'testing_execution',
    title: 'Проведение испытаний',
    description: 'Выполнение измерений и сбор данных',
    responsibleRole: 'Специалист',
    duration: '5-10 дней',
    dependencies: ['protocol_preparation']
  },
  {
    stage: 'report_preparation',
    title: 'Подготовка отчета',
    description: 'Анализ данных и формирование отчета',
    responsibleRole: 'Специалист',
    duration: '2 дня',
    dependencies: ['testing_execution']
  },
  {
    stage: 'report_approval',
    title: 'Согласование отчета',
    description: 'Проверка и согласование отчета руководителем',
    responsibleRole: 'Руководитель',
    duration: '1 день',
    dependencies: ['report_preparation']
  },
  {
    stage: 'report_printing',
    title: 'Печать отчета',
    description: 'Подготовка финальной версии и печать',
    responsibleRole: 'Специалист',
    duration: '1 день',
    dependencies: ['report_approval']
  },
  {
    stage: 'completed',
    title: 'Завершен',
    description: 'Проект полностью завершен',
    responsibleRole: 'Все',
    duration: '-',
    dependencies: ['report_printing']
  }
];

export const StageManagement: React.FC<StageManagementProps> = ({
  project,
  users,
  currentUser,
  onProjectUpdate
}) => {
  const [editingStage, setEditingStage] = useState<ProjectStatus | null>(null);
  const [stageAssignments, setStageAssignments] = useState<{
    [key in ProjectStatus]?: {
      assignedUserId?: string;
      notes?: string;
    }
  }>({});
  const [loading, setLoading] = useState(false);

  // Инициализация назначений этапов из проекта
  React.useEffect(() => {
    const assignments: any = {};
    project.stageAssignments.forEach(assignment => {
      assignments[assignment.stage] = {
        assignedUserId: assignment.assignedUserId,
        notes: assignment.notes
      };
    });
    setStageAssignments(assignments);
  }, [project.stageAssignments]);

  // Проверка доступа к управлению этапами
  const canManageStages = currentUser.role === 'administrator' || currentUser.role === 'manager';

  // Проверка, можно ли активировать этап
  const canActivateStage = (stage: ProjectStatus): boolean => {
    const stageInfo = STAGES.find(s => s.stage === stage);
    if (!stageInfo?.dependencies) return true;

    // Проверяем, что все зависимые этапы завершены
    return stageInfo.dependencies.every(depStage => {
      const assignment = project.stageAssignments.find(a => a.stage === depStage);
      return assignment?.completedAt;
    });
  };

  // Получение статуса этапа
  const getStageStatus = (stage: ProjectStatus): 'completed' | 'active' | 'pending' | 'blocked' => {
    const assignment = project.stageAssignments.find(a => a.stage === stage);
    
    if (assignment?.completedAt) return 'completed';
    if (project.status === stage) return 'active';
    if (canActivateStage(stage)) return 'pending';
    return 'blocked';
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'blocked':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Получение иконки статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'blocked':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Сохранение назначения этапа
  const handleSaveStageAssignment = async (stage: ProjectStatus) => {
    if (!canManageStages) return;

    setLoading(true);
    try {
      const assignment = stageAssignments[stage];
      await projectService.updateStageAssignment(
        project.id,
        stage,
        assignment?.assignedUserId,
        assignment?.notes
      );

      // Обновляем проект
      const updatedProjects = await projectService.getAllProjects();
      const updatedProject = updatedProjects.find(p => p.id === project.id);
      if (updatedProject) {
        onProjectUpdate(updatedProject);
      }

      setEditingStage(null);
    } catch (error) {
      console.error('Ошибка сохранения назначения этапа:', error);
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Завершение этапа
  const handleCompleteStage = async (stage: ProjectStatus) => {
    if (!canManageStages) return;

    if (confirm(`Вы уверены, что хотите завершить этап "${ProjectStatusLabels[stage]}"?`)) {
      setLoading(true);
      try {
        await projectService.updateStageAssignment(
          project.id,
          stage,
          stageAssignments[stage]?.assignedUserId,
          stageAssignments[stage]?.notes,
          true
        );

        // Если это текущий этап проекта, переводим проект на следующий этап
        if (project.status === stage) {
          const currentStageIndex = STAGES.findIndex(s => s.stage === stage);
          const nextStage = STAGES[currentStageIndex + 1];
          
          if (nextStage) {
            await projectService.updateProject(project.id, { status: nextStage.stage });
          }
        }

        // Обновляем проект
        const updatedProjects = await projectService.getAllProjects();
        const updatedProject = updatedProjects.find(p => p.id === project.id);
        if (updatedProject) {
          onProjectUpdate(updatedProject);
        }

        alert('Этап успешно завершен');
      } catch (error) {
        console.error('Ошибка завершения этапа:', error);
        alert(`Ошибка завершения этапа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Обновление назначения этапа
  const updateStageAssignment = (stage: ProjectStatus, field: 'assignedUserId' | 'notes', value: string) => {
    setStageAssignments(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: value
      }
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Управление этапами проекта</h2>
        {!canManageStages && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Только для просмотра
          </span>
        )}
      </div>

      <div className="space-y-6">
        {STAGES.map((stageInfo, index) => {
          const status = getStageStatus(stageInfo.stage);
          const assignment = project.stageAssignments.find(a => a.stage === stageInfo.stage);
          const assignedUser = assignment?.assignedUserId ? 
            users.find(u => u.id === assignment.assignedUserId) : null;

          return (
            <div key={stageInfo.stage} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {index + 1}. {stageInfo.title}
                    </h3>
                    <p className="text-sm text-gray-600">{stageInfo.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                    {status === 'completed' ? 'Завершен' :
                     status === 'active' ? 'Активен' :
                     status === 'pending' ? 'Ожидает' : 'Заблокирован'}
                  </span>
                  {canManageStages && status !== 'completed' && status !== 'blocked' && (
                    <button
                      onClick={() => setEditingStage(editingStage === stageInfo.stage ? null : stageInfo.stage)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      title="Управление этапом"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Информация об этапе */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                <div>
                  <span className="font-medium">Ответственный:</span> {stageInfo.responsibleRole}
                </div>
                <div>
                  <span className="font-medium">Длительность:</span> {stageInfo.duration}
                </div>
                <div>
                  <span className="font-medium">Назначен:</span> {
                    assignedUser ? assignedUser.fullName : 'Не назначен'
                  }
                </div>
              </div>

              {/* Даты */}
              {assignment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Назначен:</span> {
                      assignment.assignedAt.toLocaleDateString('ru-RU')
                    }
                  </div>
                  {assignment.completedAt && (
                    <div>
                      <span className="font-medium">Завершен:</span> {
                        assignment.completedAt.toLocaleDateString('ru-RU')
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Примечания */}
              {assignment?.notes && (
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Примечания:</span> {assignment.notes}
                </div>
              )}

              {/* Форма редактирования этапа */}
              {editingStage === stageInfo.stage && canManageStages && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Назначить исполнителя
                      </label>
                      <select
                        value={stageAssignments[stageInfo.stage]?.assignedUserId || ''}
                        onChange={(e) => updateStageAssignment(stageInfo.stage, 'assignedUserId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Выберите исполнителя</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.fullName} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Примечания
                      </label>
                      <input
                        type="text"
                        value={stageAssignments[stageInfo.stage]?.notes || ''}
                        onChange={(e) => updateStageAssignment(stageInfo.stage, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Добавить примечания"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setEditingStage(null)}
                      className="px-3 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveStageAssignment(stageInfo.stage)}
                      disabled={loading}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                    {status === 'active' && (
                      <button
                        onClick={() => handleCompleteStage(stageInfo.stage)}
                        disabled={loading}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Завершить этап</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Зависимости */}
              {stageInfo.dependencies && (
                <div className="mt-3 text-xs text-gray-500">
                  <span className="font-medium">Зависит от:</span> {
                    stageInfo.dependencies.map(dep => ProjectStatusLabels[dep]).join(', ')
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Общая статистика */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Статистика проекта</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {project.stageAssignments.filter(a => a.completedAt).length}
            </div>
            <div className="text-xs text-gray-500">Завершено этапов</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">1</div>
            <div className="text-xs text-gray-500">Активный этап</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {STAGES.length - project.stageAssignments.filter(a => a.completedAt).length - 1}
            </div>
            <div className="text-xs text-gray-500">Ожидает</div>
          </div>
          <div>
            <div className="text-lg font-bold text-indigo-600">
              {Math.round((project.stageAssignments.filter(a => a.completedAt).length / STAGES.length) * 100)}%
            </div>
            <div className="text-xs text-gray-500">Прогресс</div>
          </div>
        </div>
      </div>
    </div>
  );
};