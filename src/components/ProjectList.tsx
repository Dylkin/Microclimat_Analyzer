import React, { useState } from 'react';
import { Project } from '../types/Project';
import { User } from '../types/User';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Building, 
  FileText, 
  TestTube, 
  Zap, 
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { ProjectDetailsModal } from './ProjectDetailsModal';

interface ProjectListProps {
  projects: Project[];
  onEditProject?: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onEditProject }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'startDate' | 'endDate' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleEditProject = (project: Project) => {
    if (onEditProject) {
      onEditProject(project);
    }
  };

  const handleDetailsProject = (project: Project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'validation': return TestTube;
      case 'qualification': return CheckCircle;
      case 'calibration': return Zap;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'contract': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'contract': return 'Договор';
      case 'in_progress': return 'В работе';
      case 'paused': return 'Пауза';
      case 'closed': return 'Закрыт';
      default: return status;
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'draft', label: 'Черновик' },
    { value: 'contract', label: 'Договор' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'paused', label: 'Пауза' },
    { value: 'closed', label: 'Закрыт' }
  ];

  const handleSort = (field: 'name' | 'startDate' | 'endDate' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredProjects = projects.filter(project => 
    filterStatus === 'all' || project.status === filterStatus
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'startDate':
        aValue = new Date(a.startDate);
        bValue = new Date(b.startDate);
        break;
      case 'endDate':
        aValue = a.endDate ? new Date(a.endDate) : new Date('9999-12-31');
        bValue = b.endDate ? new Date(b.endDate) : new Date('9999-12-31');
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Фильтры и сортировка */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`px-3 py-2 text-sm rounded-md ${
              sortBy === 'name' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Название {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('startDate')}
            className={`px-3 py-2 text-sm rounded-md ${
              sortBy === 'startDate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Дата начала {sortBy === 'startDate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('endDate')}
            className={`px-3 py-2 text-sm rounded-md ${
              sortBy === 'endDate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Дата окончания {sortBy === 'endDate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('status')}
            className={`px-3 py-2 text-sm rounded-md ${
              sortBy === 'status' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Статус {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Таблица проектов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Проект
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Даты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ответственный
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Объекты
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProjects.map((project) => {
                const TypeIcon = getTypeIcon(project.type);
                const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'closed';

                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TypeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {project.type === 'validation' ? 'Валидация' : 
                         project.type === 'qualification' ? 'Квалификация' : 
                         project.type === 'calibration' ? 'Калибровка' : project.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                      {isOverdue && (
                        <div className="text-xs text-red-600 mt-1">Просрочен</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(project.startDate).toLocaleDateString('ru-RU')}
                      </div>
                      {project.endDate && (
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(project.endDate).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {project.responsibleUser?.name || 'Не назначен'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {project.qualificationObjects?.length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDetailsProject(project)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Просмотр деталей"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditProject(project)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedProjects.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет проектов</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? 'Начните с создания нового проекта.' 
                : 'Нет проектов с выбранным статусом.'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно деталей проекта */}
      {showDetailsModal && selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
};