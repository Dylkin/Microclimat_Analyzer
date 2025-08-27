import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, Building2, MapPin } from 'lucide-react';
import { projectService } from '../utils/projectService';
import { contractorService } from '../utils/contractorService';
import { userService } from '../utils/userService';
import type { Project } from '../types/Project';
import type { Contractor } from '../types/Contractor';
import type { User as UserType } from '../types/User';

interface ProjectDirectoryProps {
  onPageChange: (page: string, projectData?: any) => void;
}

export const ProjectDirectory: React.FC<ProjectDirectoryProps> = ({ onPageChange }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    contractor_id: '',
    contract_number: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, contractorsData, usersData] = await Promise.all([
        projectService.getAllProjects(),
        contractorService.getAll(),
        userService.getAll()
      ]);
      setProjects(projectsData);
      setContractors(contractorsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.create(newProject);
      setNewProject({ name: '', description: '', contractor_id: '', contract_number: '' });
      setShowCreateForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor?.name || 'Неизвестный контрагент';
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Не назначен';
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Неизвестный пользователь';
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      contract_negotiation: 'Согласование договора',
      protocol_preparation: 'Подготовка протокола',
      testing_start: 'Начало испытаний',
      testing_execution: 'Выполнение испытаний',
      testing_completion: 'Завершение испытаний',
      report_preparation: 'Подготовка отчета',
      report_approval: 'Утверждение отчета',
      report_printing: 'Печать отчета',
      completed: 'Завершен',
      requalification: 'Переквалификация'
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      contract_negotiation: 'bg-yellow-100 text-yellow-800',
      protocol_preparation: 'bg-blue-100 text-blue-800',
      testing_start: 'bg-purple-100 text-purple-800',
      testing_execution: 'bg-indigo-100 text-indigo-800',
      testing_completion: 'bg-green-100 text-green-800',
      report_preparation: 'bg-orange-100 text-orange-800',
      report_approval: 'bg-pink-100 text-pink-800',
      report_printing: 'bg-gray-100 text-gray-800',
      completed: 'bg-emerald-100 text-emerald-800',
      requalification: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionButton = (project: Project) => {
    switch (project.status) {
      case 'contract_negotiation':
        return (
          <button
            onClick={() => onPageChange('contract_negotiation', project)}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4 mr-1" />
            Согласовать договор
          </button>
        );
      default:
        return null;
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getContractorName(project.contractor_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Создать проект
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Поиск проектов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Создать новый проект</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название проекта
                </label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Контрагент
                </label>
                <select
                  required
                  value={newProject.contractor_id}
                  onChange={(e) => setNewProject({ ...newProject, contractor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите контрагента</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер договора
                </label>
                <input
                  type="text"
                  value={newProject.contract_number}
                  onChange={(e) => setNewProject({ ...newProject, contract_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Проект
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контрагент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Создан
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-500">{project.description}</div>
                    )}
                    {project.contract_number && (
                      <div className="text-xs text-gray-400">Договор: {project.contract_number}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{getContractorName(project.contractor_id)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(project.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  {project.created_by && (
                    <div className="flex items-center mt-1">
                      <User className="w-4 h-4 mr-1" />
                      <span className="text-xs">{getUserName(project.created_by)}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {getActionButton(project)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет проектов</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Проекты не найдены по вашему запросу.' : 'Начните с создания нового проекта.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};