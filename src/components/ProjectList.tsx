import React, { useState } from 'react';
import { Project } from '../types/Project';
import { useProjects } from '../contexts/ProjectContext';
import { EditProjectModal } from './EditProjectModal';
import { 
  Calendar, 
  User, 
  MapPin, 
  Thermometer, 
  FileText, 
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  Edit
} from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
  const { updateProject } = useProjects();
  const [sortField, setSortField] = useState<keyof Project>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const statusOptions = [
    { value: 'draft', label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
    { value: 'preparation', label: 'Подготовка', color: 'bg-blue-100 text-blue-800' },
    { value: 'testing', label: 'Испытания', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'reporting', label: 'Отчетность', color: 'bg-purple-100 text-purple-800' },
    { value: 'completed', label: 'Завершен', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Отменен', color: 'bg-red-100 text-red-800' },
    { value: 'on_hold', label: 'Приостановлен', color: 'bg-orange-100 text-orange-800' }
  ];

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

  const getTypeText = (type: Project['type']) => {
    switch (type) {
      case 'mapping': return 'Картирование';
      case 'testing': return 'Испытания';
      case 'full_qualification': return 'Полная квалификация';
      default: return type;
    }
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [projects, sortField, sortDirection]);

  const getSortIcon = (field: keyof Project) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleStatusChange = async (projectId: string, newStatus: Project['status']) => {
    try {
      await updateProject(projectId, { status: newStatus });
      setEditingStatus(null);
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('clientName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Проект</span>
                  <span className="text-gray-400">{getSortIcon('clientName')}</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Статус</span>
                  <span className="text-gray-400">{getSortIcon('status')}</span>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center space-x-1">
                  <span>Приоритет</span>
                  <span className="text-gray-400">{getSortIcon('priority')}</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Прогресс
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Создан</span>
                  <span className="text-gray-400">{getSortIcon('createdAt')}</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Срок
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Бюджет
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedProjects.map((project) => {
              const TypeIcon = getTypeIcon(project.type);
              const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'completed';
              
              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Картирование для {project.clientName}
                        </div>
                        {project.description && project.description.trim() && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {project.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {project.qualificationObjects?.length || 0} объект(ов)
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getTypeText(project.type)}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative">
                      {editingStatus === project.id ? (
                        <select
                          value={project.status}
                          onChange={(e) => handleStatusChange(project.id, e.target.value as Project['status'])}
                          onBlur={() => setEditingStatus(null)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingStatus(project.id)}
                          className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full hover:opacity-80 transition-opacity ${getStatusColor(project.status)}`}
                        >
                          <span>{getStatusText(project.status)}</span>
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <AlertTriangle className={`w-4 h-4 mr-1 ${getPriorityColor(project.priority)}`} />
                      <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                        {project.priority.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{project.progress}%</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.endDate ? (
                      <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        <Clock className="w-4 h-4 mr-2" />
                        <div className="text-sm">
                          {new Date(project.endDate).toLocaleDateString('ru-RU')}
                        </div>
                        {isOverdue && <AlertTriangle className="w-4 h-4 ml-1" />}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Не указан</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {project.budget ? (
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <div className="text-sm text-gray-900">
                          {project.budget.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Не указан</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Редактировать проект"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <MoreHorizontal className="w-5 h-5" />
                      </div>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {sortedProjects.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Проекты не найдены</h3>
          <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>

      {/* Edit Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </>
  );
};