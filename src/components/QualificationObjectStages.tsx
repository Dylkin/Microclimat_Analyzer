import React, { useState } from 'react';
import { QualificationObject, QualificationStage, QualificationStageStatus } from '../types/Project';
import { useAuth } from '../contexts/AuthContext';
import { 
  Clock, 
  User, 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle, 
  Edit2, 
  Save, 
  X,
  AlertTriangle,
  FileText,
  Settings,
  Wrench,
  TestTube,
  Download,
  BarChart,
  FileCheck,
  Archive,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  getStageStatusText, 
  getStageStatusColor, 
  calculateObjectProgress,
  calculateObjectStatus,
  QUALIFICATION_STAGE_TEMPLATES
} from '../utils/qualificationStages';

interface QualificationObjectStagesProps {
  object: QualificationObject;
  onUpdateObject: (updates: Partial<QualificationObject>) => void;
  projectUsers: Array<{ id: string; name: string; role: string }>;
}

export const QualificationObjectStages: React.FC<QualificationObjectStagesProps> = ({
  object,
  onUpdateObject,
  projectUsers
}) => {
  const { user } = useAuth();
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<{ stageId: string; duration: number } | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [tempNotes, setTempNotes] = useState<string>('');

  const getStageIcon = (type: QualificationStage['type']) => {
    switch (type) {
      case 'documentation_collection': return FileText;
      case 'protocol_preparation': return FileCheck;
      case 'equipment_setup': return Wrench;
      case 'testing_execution': return TestTube;
      case 'data_extraction': return Download;
      case 'report_preparation': return BarChart;
      case 'report_approval': return CheckCircle;
      case 'documentation_finalization': return Archive;
      case 'closed': return CheckCircle;
      case 'paused': return Pause;
      default: return Clock;
    }
  };

  const handleStageStatusChange = (stageId: string, newStatus: QualificationStageStatus) => {
    const updatedStages = object.stages.map(stage => {
      if (stage.id === stageId) {
        const updatedStage = { ...stage, status: newStatus, updatedAt: new Date() };
        
        // Устанавливаем даты начала и окончания
        if (newStatus === 'in_progress' && !stage.startDate) {
          updatedStage.startDate = new Date();
        }
        
        if (newStatus === 'completed' && !stage.endDate) {
          updatedStage.endDate = new Date();
          // Рассчитываем фактическую длительность
          if (stage.startDate) {
            const actualDays = Math.ceil((new Date().getTime() - stage.startDate.getTime()) / (1000 * 60 * 60 * 24));
            updatedStage.actualDuration = actualDays;
          }
        }
        
        return updatedStage;
      }
      return stage;
    });

    // Обновляем общий прогресс и статус объекта
    const overallProgress = calculateObjectProgress(updatedStages);
    const overallStatus = calculateObjectStatus(updatedStages);

    onUpdateObject({
      stages: updatedStages,
      overallProgress,
      overallStatus,
      updatedAt: new Date()
    });
  };

  const handleAssigneeChange = (stageId: string, assigneeId: string) => {
    const assignee = projectUsers.find(u => u.id === assigneeId);
    const updatedStages = object.stages.map(stage =>
      stage.id === stageId 
        ? { 
            ...stage, 
            assigneeId, 
            assigneeName: assignee?.name || '',
            updatedAt: new Date()
          }
        : stage
    );

    onUpdateObject({
      stages: updatedStages,
      updatedAt: new Date()
    });
  };

  const handleDurationChange = (stageId: string, newDuration: number) => {
    if (newDuration < 1) return;

    const updatedStages = object.stages.map(stage => {
      if (stage.id === stageId) {
        const updatedStage = { ...stage, estimatedDuration: newDuration, updatedAt: new Date() };
        
        // Пересчитываем плановую дату окончания если есть плановая дата начала
        if (stage.plannedStartDate) {
          updatedStage.plannedEndDate = new Date(
            stage.plannedStartDate.getTime() + newDuration * 24 * 60 * 60 * 1000
          );
        }
        
        return updatedStage;
      }
      return stage;
    });

    onUpdateObject({
      stages: updatedStages,
      updatedAt: new Date()
    });
    
    setEditingDuration(null);
  };

  const handleStartStage = (stageId: string) => {
    handleStageStatusChange(stageId, 'in_progress');
  };

  const handleCompleteStage = (stageId: string) => {
    handleStageStatusChange(stageId, 'completed');
  };

  const handlePauseStage = (stageId: string) => {
    handleStageStatusChange(stageId, 'paused');
  };

  const handleResetStage = (stageId: string) => {
    const updatedStages = object.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          status: 'pending' as QualificationStageStatus,
          startDate: undefined,
          endDate: undefined,
          actualDuration: undefined,
          updatedAt: new Date()
        };
      }
      return stage;
    });

    const overallProgress = calculateObjectProgress(updatedStages);
    const overallStatus = calculateObjectStatus(updatedStages);

    onUpdateObject({
      stages: updatedStages,
      overallProgress,
      overallStatus,
      updatedAt: new Date()
    });
  };

  const handleDeleteStage = (stageId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот этап?')) {
      const updatedStages = object.stages.filter(stage => stage.id !== stageId);
      
      const overallProgress = calculateObjectProgress(updatedStages);
      const overallStatus = calculateObjectStatus(updatedStages);

      onUpdateObject({
        stages: updatedStages,
        overallProgress,
        overallStatus,
        updatedAt: new Date()
      });
    }
  };

  const handleAddStage = (stageType: QualificationStage['type']) => {
    const template = QUALIFICATION_STAGE_TEMPLATES.find(t => t.type === stageType);
    if (!template) return;

    // Находим последний этап для расчета даты начала нового этапа
    const existingStages = object.stages.filter(s => s.isRequired).sort((a, b) => a.order - b.order);
    const lastStage = existingStages[existingStages.length - 1];
    
    let plannedStartDate = new Date();
    if (lastStage && lastStage.plannedEndDate) {
      plannedStartDate = new Date(lastStage.plannedEndDate);
    }

    const newStage: QualificationStage = {
      id: `${object.id}_stage_${stageType}_${Date.now()}`,
      type: stageType,
      name: template.name,
      description: template.description,
      status: 'pending',
      estimatedDuration: template.estimatedDuration,
      order: Math.max(...object.stages.map(s => s.order), 0) + 1,
      isRequired: template.isRequired,
      plannedStartDate,
      plannedEndDate: new Date(plannedStartDate.getTime() + template.estimatedDuration * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedStages = [...object.stages, newStage];
    
    onUpdateObject({
      stages: updatedStages,
      updatedAt: new Date()
    });
    
    setShowAddStageModal(false);
  };

  const handleUpdateStageNotes = (stageId: string, notes: string) => {
    const updatedStages = object.stages.map(stage =>
      stage.id === stageId 
        ? { ...stage, notes, updatedAt: new Date() }
        : stage
    );

    onUpdateObject({
      stages: updatedStages,
      updatedAt: new Date()
    });
    
    setEditingNotes(null);
    setTempNotes('');
  };

  const handleStartEditingNotes = (stage: QualificationStage) => {
    setEditingNotes(stage.id);
    setTempNotes(stage.notes || '');
  };
  const canStartStage = (stage: QualificationStage): boolean => {
    if (stage.status !== 'pending') return false;
    
    // Проверяем, что все предыдущие обязательные этапы завершены
    const requiredStages = object.stages
      .filter(s => s.isRequired && s.order < stage.order)
      .sort((a, b) => a.order - b.order);
    
    return requiredStages.every(s => s.status === 'completed');
  };

  const getStageActions = (stage: QualificationStage) => {
    const actions = [];

    if (stage.status === 'pending' && canStartStage(stage)) {
      actions.push(
        <button
          key="start"
          onClick={() => handleStartStage(stage.id)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
          title="Начать этап"
        >
          <Play className="w-4 h-4" />
        </button>
      );
    }

    if (stage.status === 'in_progress') {
      actions.push(
        <button
          key="complete"
          onClick={() => handleCompleteStage(stage.id)}
          className="text-green-600 hover:text-green-800 transition-colors"
          title="Завершить этап"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
      );
      
      actions.push(
        <button
          key="pause"
          onClick={() => handlePauseStage(stage.id)}
          className="text-orange-600 hover:text-orange-800 transition-colors"
          title="Приостановить этап"
        >
          <Pause className="w-4 h-4" />
        </button>
      );
    }

    if (stage.status === 'paused') {
      actions.push(
        <button
          key="resume"
          onClick={() => handleStageStatusChange(stage.id, 'in_progress')}
          className="text-blue-600 hover:text-blue-800 transition-colors"
          title="Возобновить этап"
        >
          <Play className="w-4 h-4" />
        </button>
      );
    }

    // Кнопка сброса этапа (доступна для завершенных этапов)
    if (stage.status === 'completed') {
      actions.push(
        <button
          key="reset"
          onClick={() => handleResetStage(stage.id)}
          className="text-gray-600 hover:text-gray-800 transition-colors"
          title="Сбросить этап"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      );
    }

    // Кнопка удаления (только для необязательных этапов)
    if (!stage.isRequired) {
      actions.push(
        <button
          key="delete"
          onClick={() => handleDeleteStage(stage.id)}
          className="text-red-600 hover:text-red-800 transition-colors"
          title="Удалить этап"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      );
    }

    return actions;
  };

  // Сортируем этапы по порядку
  const sortedStages = [...object.stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Заголовок с общим прогрессом */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          Этапы выполнения: {object.name || `${object.type} #${object.id.slice(-4)}`}
        </h4>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAddStageModal(true)}
            className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить этап</span>
          </button>
          <div className="text-sm text-gray-600">
            Прогресс: {object.overallProgress || 0}%
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${object.overallProgress || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Список этапов */}
      <div className="space-y-3">
        {sortedStages.map((stage, index) => {
          const StageIcon = getStageIcon(stage.type);
          const isOverdue = stage.plannedEndDate && 
                           new Date(stage.plannedEndDate) < new Date() && 
                           stage.status !== 'completed';

          return (
            <div 
              key={stage.id} 
              className={`border rounded-lg p-4 transition-colors ${
                stage.status === 'in_progress' ? 'border-blue-300 bg-blue-50' :
                stage.status === 'completed' ? 'border-green-300 bg-green-50' :
                stage.status === 'paused' ? 'border-orange-300 bg-orange-50' :
                isOverdue ? 'border-red-300 bg-red-50' :
                'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <StageIcon className={`w-5 h-5 ${
                    stage.status === 'completed' ? 'text-green-600' :
                    stage.status === 'in_progress' ? 'text-blue-600' :
                    stage.status === 'paused' ? 'text-orange-600' :
                    'text-gray-400'
                  }`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">{stage.name}</h5>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStageStatusColor(stage.status)}`}>
                        {getStageStatusText(stage.status)}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center space-x-1 text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="text-xs">Просрочен</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Длительность */}
                  <div className="text-sm text-gray-600">
                    {editingDuration?.stageId === stage.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={editingDuration.duration}
                          onChange={(e) => setEditingDuration({
                            stageId: stage.id,
                            duration: parseInt(e.target.value) || 1
                          })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleDurationChange(stage.id, editingDuration.duration)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingDuration(null)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => setEditingDuration({ stageId: stage.id, duration: stage.estimatedDuration })}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{stage.estimatedDuration} дн.</span>
                        <Edit2 className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Ответственный */}
                  <div className="min-w-32">
                    <select
                      value={stage.assigneeId || ''}
                      onChange={(e) => handleAssigneeChange(stage.id, e.target.value)}
                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Не назначен</option>
                      {projectUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center space-x-2">
                    {getStageActions(stage)}
                  </div>
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                {stage.plannedStartDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>План. начало: {stage.plannedStartDate.toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
                
                {stage.plannedEndDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>План. окончание: {stage.plannedEndDate.toLocaleDateString('ru-RU')}</span>
                  </div>
                )}

                {stage.actualDuration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Факт. длительность: {stage.actualDuration} дн.</span>
                  </div>
                )}
              </div>

              {/* Заметки */}
              {stage.notes && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                  <strong>Заметки:</strong> {stage.notes}
                </div>
              )}

              {/* Редактирование заметок */}
              <div className="mt-3">
                {editingNotes === stage.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      rows={3}
                      placeholder="Добавьте заметки к этапу..."
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateStageNotes(stage.id, tempNotes)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Сохранить</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(null);
                          setTempNotes('');
                        }}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Отмена</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditingNotes(stage)}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{stage.notes ? 'Редактировать заметки' : 'Добавить заметки'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Общая информация */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Общий статус:</span>
            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
              object.overallStatus === 'completed' ? 'bg-green-100 text-green-800' :
              object.overallStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              object.overallStatus === 'paused' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {object.overallStatus === 'not_started' ? 'Не начат' :
               object.overallStatus === 'in_progress' ? 'В работе' :
               object.overallStatus === 'completed' ? 'Завершен' :
               object.overallStatus === 'paused' ? 'Приостановлен' :
               object.overallStatus}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Завершенных этапов:</span>
            <span className="ml-2 text-gray-900">
              {object.stages.filter(s => s.status === 'completed').length} из {object.stages.filter(s => s.isRequired).length}
            </span>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Общая длительность:</span>
            <span className="ml-2 text-gray-900">
              {object.stages.filter(s => s.isRequired).reduce((sum, s) => sum + s.estimatedDuration, 0)} дн.
            </span>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления этапа */}
      {showAddStageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Добавить этап</h3>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Выберите тип этапа для добавления:
              </p>
              
              <div className="space-y-2">
                {QUALIFICATION_STAGE_TEMPLATES.map((template) => {
                  const StageIcon = getStageIcon(template.type);
                  const alreadyExists = object.stages.some(s => s.type === template.type);
                  
                  return (
                    <button
                      key={template.type}
                      onClick={() => handleAddStage(template.type)}
                      disabled={alreadyExists}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors text-left ${
                        alreadyExists 
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <StageIcon className={`w-5 h-5 ${alreadyExists ? 'text-gray-400' : 'text-indigo-600'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">
                          {template.description} ({template.estimatedDuration} дн.)
                        </div>
                        {alreadyExists && (
                          <div className="text-xs text-gray-400 mt-1">Этап уже существует</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddStageModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};