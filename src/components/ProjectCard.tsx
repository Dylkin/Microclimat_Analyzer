import React from 'react';
import { Project } from '../types/Project';
import { useProjects } from '../contexts/ProjectContext';
import { EditProjectModal } from './EditProjectModal';
import { 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MoreHorizontal,
  MapPin,
  Thermometer,
  FileText,
  Edit3,
  Edit
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const { updateProject } = useProjects();
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
    { value: 'contract', label: 'Договор', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'В работе', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paused', label: 'Пауза', color: 'bg-orange-100 text-orange-800' },
    { value: 'closed', label: 'Закрыт', color: 'bg-green-100 text-green-800' }
  ];

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

  const getTypeIcon = (type: Project['type']) => {
    switch (type) {
      case 'mapping': return MapPin;
      case 'testing': return Thermometer;
      case 'full_qualification': return FileText;
      default: return FileText;
    }
  };

  const TypeIcon = getTypeIcon(project.type);

  const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'closed';

  const handleStatusChange = async (newStatus: Project['status']) => {
    try {
      await updateProject(project.id, { status: newStatus });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusMenu(!showStatusMenu);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  return (
    <>
      <div className="relative">
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
            <div className="flex items-center space-x-1">
              <button
                onClick={handleEditClick}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Редактировать проект"
              >
                <Edit className="w-4 h-4" />
              </button>
              <MoreHorizontal className="w-5 h-5" />
            </div>
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
          <div className="relative">
            <button
              onClick={handleStatusClick}
              className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full hover:opacity-80 transition-opacity ${getStatusColor(project.status)}`}
            >
              <span>{getStatusText(project.status)}</span>
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
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

      {/* Status Menu */}
      {showStatusMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowStatusMenu(false)}
          />
          <div className="absolute top-20 left-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Изменить статус
            </div>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value as Project['status'])}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  project.status === option.value ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};