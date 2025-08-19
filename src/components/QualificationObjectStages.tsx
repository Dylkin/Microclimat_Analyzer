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
  Archive
} from 'lucide-react';
import { 
  getStageStatusText, 
  getStageStatusColor, 
  calculateObjectProgress,
  calculateObjectStatus 
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
        <div className="flex items-center space-x-3">
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
    </div>
  );
};