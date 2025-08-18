import React from 'react';
import { Project } from '../types/Project';
import { 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MoreHorizontal,
  MapPin,
  Thermometer,
  FileText
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'preparation': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'reporting': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'preparation': return 'Подготовка';
      case 'testing': return 'Испытания';
      case 'reporting': return 'Отчетность';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      case 'on_hold': return 'Приостановлен';
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

  const getTypeIcon = (type: Project['type']) => {
    switch (type) {
      case 'mapping': return MapPin;
      case 'testing': return Thermometer;
      case 'full_qualification': return FileText;
      default: return FileText;
    }
  };

  const TypeIcon = getTypeIcon(project.type);

  const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed';

  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <TypeIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                Картирование для {project.clientName}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {project.qualificationObjects?.length || 0} объект(ов) квалификации
              </p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Qualification Objects */}
        {project.qualificationObjects && project.qualificationObjects.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Объекты квалификации:</p>
            <div className="flex flex-wrap gap-1">
              {project.qualificationObjects.slice(0, 3).map((obj, index) => (
                <span 
                  key={index}
                  className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                >
                  {obj.name || `${obj.type} #${index + 1}`}
                </span>
              ))}
              {project.qualificationObjects.length > 3 && (
                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  +{project.qualificationObjects.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status and Priority */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
          <div className="flex items-center space-x-1">
            <AlertTriangle className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
            <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
              {project.priority.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Прогресс</span>
            <span className="text-xs text-gray-900 font-medium">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{project.managerName}</span>
          </div>
          
          {project.endDate && (
            <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(project.endDate).toLocaleDateString('ru-RU')}
              </span>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
            </div>
          )}
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Current Stage */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Текущий этап: <span className="font-medium">{project.currentStage}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};