import React, { useState } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FolderOpen, 
  Plus, 
  Calendar, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Filter,
  Search,
  List
} from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectKanban } from './ProjectKanban';
import { ProjectList } from './ProjectList';
import { ProjectDashboard } from './ProjectDashboard';

type ViewMode = 'dashboard' | 'list' | 'kanban';

export const ProjectManagement: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { projects } = useProjects();
  
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Фильтрация проектов
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'dashboard': return BarChart3;
      case 'list': return List;
      case 'kanban': return FolderOpen;
      default: return List;
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return <ProjectDashboard projects={filteredProjects} />;
      case 'list':
        return <ProjectList projects={filteredProjects} />;
      case 'kanban':
        return <ProjectKanban projects={filteredProjects} />;
      default:
        return null;
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Управление проектами</h1>
        </div>
        
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Создать проект</span>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск проектов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновик</option>
                <option value="preparation">Подготовка</option>
                <option value="testing">Испытания</option>
                <option value="reporting">Отчетность</option>
                <option value="completed">Завершен</option>
                <option value="cancelled">Отменен</option>
              </select>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Все приоритеты</option>
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="urgent">Срочный</option>
            </select>

            {/* View Mode Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['dashboard', 'list', 'kanban'] as ViewMode[]).map((mode) => {
                const Icon = getViewModeIcon(mode);
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={mode}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-96">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Проекты не найдены</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Создайте первый проект для начала работы'
              }
            </p>
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Создать проект
              </button>
            )}
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};