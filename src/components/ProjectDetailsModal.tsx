import React, { useState } from 'react';
import { Project, QualificationObject } from '../types/Project';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { QualificationObjectStages } from './QualificationObjectStages';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  DollarSign,
  Building,
  Truck,
  Snowflake,
  ChevronDown,
  ChevronRight,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

interface ProjectDetailsModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ project, onClose }) => {
  const { updateProject } = useProjects();
  const { users } = useAuth();
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

  // Получаем пользователей для назначения на этапы
  const projectUsers = users.map(user => ({
    id: user.id,
    name: user.fullName,
    role: user.role
  }));

  const getObjectTypeIcon = (type: QualificationObject['type']) => {
    switch (type) {
      case 'room': return Building;
      case 'automobile': return Truck;
      case 'refrigerator_chamber':
      case 'refrigerator':
      case 'freezer':
      case 'thermocontainer': return Snowflake;
      default: return Building;
    }
  };

  const getObjectTypeText = (type: QualificationObject['type']) => {
    switch (type) {
      case 'room': return 'Помещение';
      case 'automobile': return 'Автомобиль';
      case 'refrigerator_chamber': return 'Холодильная камера';
      case 'refrigerator': return 'Холодильник';
      case 'freezer': return 'Морозильник';
      case 'thermocontainer': return 'Термоконтейнер';
      default: return type;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'contract': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'contract': return 'Договор';
      case 'in_progress': return 'В работе';
      case 'paused': return 'Пауза';
      case 'closed': return 'Закрыт';
      default: return status;
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const toggleObjectExpansion = (objectId: string) => {
    const newExpanded = new Set(expandedObjects);
    if (newExpanded.has(objectId)) {
      newExpanded.delete(objectId);
    } else {
      newExpanded.add(objectId);
    }
    setExpandedObjects(newExpanded);
  };

  const handleUpdateQualificationObject = (objectId: string, updates: Partial<QualificationObject>) => {
    const updatedObjects = project.qualificationObjects?.map(obj =>
      obj.id === objectId ? { ...obj, ...updates, updatedAt: new Date() } : obj
    ) || [];

    updateProject(project.id, {
      qualificationObjects: updatedObjects,
      updatedAt: new Date()
    });
  };

  // Расчет общего прогресса проекта на основе объектов квалификации
  const calculateProjectProgress = () => {
    if (!project.qualificationObjects || project.qualificationObjects.length === 0) {
      return project.progress;
    }

    const totalProgress = project.qualificationObjects.reduce(
      (sum, obj) => sum + (obj.overallProgress || 0), 
      0
    );
    
    return Math.round(totalProgress / project.qualificationObjects.length);
  };

  const projectProgress = calculateProjectProgress();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MapPin className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Картирование для {project.clientName}
              </h2>
              <p className="text-sm text-gray-600">
                {project.qualificationObjects?.length || 0} объект(ов) квалификации
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Основная информация о проекте */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Информация о проекте</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
                <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                  Приоритет: {project.priority.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Менеджер: {project.managerName}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>

            {/* Прогресс проекта */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Общий прогресс проекта</span>
                <span className="text-sm text-gray-900 font-medium">{projectProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${projectProgress}%` }}
                ></div>
              </div>
            </div>

            {project.description && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Описание:</span>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>
            )}
          </div>

          {/* Объекты квалификации и их этапы */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Объекты квалификации</h3>
            
            {project.qualificationObjects && project.qualificationObjects.length > 0 ? (
              <div className="space-y-4">
                {project.qualificationObjects.map((obj) => {
                  const ObjectIcon = getObjectTypeIcon(obj.type);
                  const isExpanded = expandedObjects.has(obj.id);
                  
                  return (
                    <div key={obj.id} className="border border-gray-200 rounded-lg">
                      {/* Заголовок объекта */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleObjectExpansion(obj.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <ObjectIcon className="w-5 h-5 text-indigo-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {obj.name || `${getObjectTypeText(obj.type)} #${obj.id.slice(-4)}`}
                            </h4>
                            <p className="text-sm text-gray-600">{getObjectTypeText(obj.type)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Прогресс объекта */}
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${obj.overallProgress || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{obj.overallProgress || 0}%</span>
                          </div>
                          
                          {/* Статус объекта */}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            obj.overallStatus === 'completed' ? 'bg-green-100 text-green-800' :
                            obj.overallStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            obj.overallStatus === 'paused' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {obj.overallStatus === 'not_started' ? 'Не начат' :
                             obj.overallStatus === 'in_progress' ? 'В работе' :
                             obj.overallStatus === 'completed' ? 'Завершен' :
                             obj.overallStatus === 'paused' ? 'Приостановлен' :
                             obj.overallStatus}
                          </span>
                          
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Этапы объекта */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-4">
                          <QualificationObjectStages
                            object={obj}
                            onUpdateObject={(updates) => handleUpdateQualificationObject(obj.id, updates)}
                            projectUsers={projectUsers}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Объекты квалификации не добавлены</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};