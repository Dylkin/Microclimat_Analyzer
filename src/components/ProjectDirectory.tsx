import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, Save, X, Search, User, Building2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Project, ProjectStatus, ProjectStatusLabels, ProjectStatusColors, CreateProjectData } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { User as UserType } from '../types/User';
import { projectService } from '../utils/projectService';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { useAuth } from '../contexts/AuthContext';

export const ProjectDirectory: React.FC = () => {
  const { user, users } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  
  // Form state
  const [newProject, setNewProject] = useState<CreateProjectData>({
    description: '',
    contractorId: '',
    qualificationObjectIds: []
  });

  const [editProject, setEditProject] = useState<{
    description: string;
    contractNumber: string;
    status: ProjectStatus;
    qualificationObjectIds: string[];
  }>({
    description: '',
    contractNumber: '',
    status: 'contract_negotiation',
    qualificationObjectIds: []
  });

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем проекты
      if (projectService.isAvailable()) {
        const projectsData = await projectService.getAllProjects();
        setProjects(projectsData);
        setFilteredProjects(projectsData);
      }

      // Загружаем контрагентов
      if (contractorService.isAvailable()) {
        const contractorsData = await contractorService.getAllContractors();
        // Фильтруем контрагентов с валидными UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validContractors = contractorsData.filter(contractor => {
          const isValidUuid = uuidRegex.test(contractor.id);
          if (!isValidUuid) {
            console.warn(`Контрагент "${contractor.name}" имеет некорректный UUID: "${contractor.id}"`);
          }
          return isValidUuid;
        });
        setContractors(validContractors);
      }

      // Загружаем все объекты квалификации
      if (qualificationObjectService.isAvailable()) {
        const objectsData = await qualificationObjectService.getAllQualificationObjects();
        setQualificationObjects(objectsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Поиск по проектам
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(project => {
      const searchLower = searchTerm.toLowerCase();
      
      return (
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.contractorName && project.contractorName.toLowerCase().includes(searchLower)) ||
        (project.contractNumber && project.contractNumber.toLowerCase().includes(searchLower)) ||
        ProjectStatusLabels[project.status].toLowerCase().includes(searchLower)
      );
    });

    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  // Получение объектов квалификации для выбранного контрагента
  const getQualificationObjectsForContractor = (contractorId: string) => {
    return qualificationObjects.filter(obj => obj.contractorId === contractorId);
  };

  // Добавление проекта
  const handleAddProject = async () => {
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    console.log('=== ОТЛАДКА СОЗДАНИЯ ПРОЕКТА ===');
    console.log('Данные нового проекта:', newProject);
    console.log('ID контрагента:', newProject.contractorId);
    console.log('Тип ID контрагента:', typeof newProject.contractorId);
    
    // Проверяем, что contractorId является строкой
    if (typeof newProject.contractorId !== 'string') {
      console.error('Contractor ID не является строкой:', newProject.contractorId);
      alert('Ошибка: некорректный тип ID контрагента');
      return;
    }

    // Проверяем, что contractorId не пустой
    if (!newProject.contractorId || !newProject.contractorId.trim()) {
      alert('Выберите контрагента');
      return;
    }

    // Проверяем, что contractorId является валидным UUID
    const trimmedContractorId = newProject.contractorId.trim();
    
    if (!uuidRegex.test(trimmedContractorId)) {
      console.error('Некорректный UUID контрагента:', trimmedContractorId);
      alert('Ошибка: некорректный ID контрагента. Обновите страницу и попробуйте снова.');
      return;
    }

    // Находим выбранного контрагента в списке
    const selectedContractor = contractors.find(c => c.id === trimmedContractorId);
    console.log('Найденный контрагент:', selectedContractor);
    
    if (!selectedContractor) {
      console.error('Контрагент не найден в списке:', trimmedContractorId);
      alert('Ошибка: выбранный контрагент не найден. Обновите страницу и попробуйте снова.');
      return;
    }
    
    if (selectedContractor) {
      console.log('ID найденного контрагента:', selectedContractor.id);
      console.log('Тип ID найденного контрагента:', typeof selectedContractor.id);
    }
    
    // Проверяем все контрагенты на корректность UUID
    console.log('Все контрагенты:');
    contractors.forEach((contractor, index) => {
      console.log(`${index + 1}. ID: "${contractor.id}" (тип: ${typeof contractor.id}), Название: "${contractor.name}"`);
    });
    
    if (newProject.qualificationObjectIds.length === 0) {
      alert('Выберите хотя бы один объект квалификации');
      return;
    }

    // Проверяем, что все ID объектов квалификации являются валидными UUID
    const invalidQualificationObjectIds = newProject.qualificationObjectIds.filter(id => !uuidRegex.test(id));
    if (invalidQualificationObjectIds.length > 0) {
      console.error('Некорректные UUID объектов квалификации:', invalidQualificationObjectIds);
      alert('Ошибка: некорректные ID объектов квалификации. Обновите страницу и попробуйте снова.');
      return;
    }

    setOperationLoading(true);
    try {
      // Генерируем название проекта на основе выбранных объектов
      const selectedObjects = getQualificationObjectsForContractor(trimmedContractorId)
        .filter(obj => newProject.qualificationObjectIds.includes(obj.id));
      
      const contractorName = contractors.find(c => c.id === trimmedContractorId)?.name || 'Неизвестный контрагент';
      const objectNames = selectedObjects.map(obj => 
        obj.name || obj.vin || obj.serialNumber || 'Без названия'
      ).join(', ');
      
      const projectName = `${contractorName} - ${objectNames}`;
      
      const projectData = {
        ...newProject,
        contractorId: trimmedContractorId,
        name: projectName
      };
      
      const addedProject = await projectService.addProject(projectData, user?.id);
      setProjects(prev => [addedProject, ...prev]);
      
      // Сбрасываем форму
      setNewProject({
        description: '',
        contractorId: '',
        qualificationObjectIds: []
      });
      setShowAddForm(false);
      alert('Проект успешно создан');
    } catch (error) {
      console.error('Ошибка добавления проекта:', error);
      alert(`Ошибка создания проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование проекта
  const handleEditProject = (project: Project) => {
    setEditProject({
      description: project.description || '',
      contractNumber: project.contractNumber || '',
      status: project.status,
      qualificationObjectIds: project.qualificationObjects.map(obj => obj.qualificationObjectId)
    });
    setEditingProject(project.id);
  };

  const handleSaveEdit = async () => {
    setOperationLoading(true);
    try {
      const updatedProject = await projectService.updateProject(editingProject!, {
        description: editProject.description,
        contractNumber: editProject.contractNumber,
        status: editProject.status,
        qualificationObjectIds: editProject.qualificationObjectIds
      });
      
      setProjects(prev => prev.map(p => p.id === editingProject ? updatedProject : p));
      setEditingProject(null);
      alert('Проект успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления проекта:', error);
      alert(`Ошибка обновления проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление проекта
  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      setOperationLoading(true);
      try {
        await projectService.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        alert('Проект успешно удален');
      } catch (error) {
        console.error('Ошибка удаления проекта:', error);
        alert(`Ошибка удаления проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Получение иконки статуса
  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'contract_negotiation':
      case 'protocol_preparation':
      case 'report_approval':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Проекты квалификации</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Создать проект</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Поиск по проектам..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {filteredProjects.length} из {projects.length} проектов
          </div>
        )}
      </div>

      {/* Add Project Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Создать проект</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Контрагент *
              </label>
              <select
                value={newProject.contractorId}
                onChange={(e) => setNewProject(prev => ({ 
                  ...prev, 
                  contractorId: e.target.value,
                  qualificationObjectIds: [] // Сбрасываем выбранные объекты
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Выберите контрагента</option>
                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Введите описание проекта"
              />
            </div>

            {/* Объекты квалификации */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объекты квалификации *
              </label>
              {newProject.contractorId ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {getQualificationObjectsForContractor(newProject.contractorId).map((obj) => {
                    const objectName = obj.name || obj.vin || obj.serialNumber || 'Без названия';
                    return (
                      <label key={obj.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={newProject.qualificationObjectIds.includes(obj.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewProject(prev => ({
                                ...prev,
                                qualificationObjectIds: [...prev.qualificationObjectIds, obj.id]
                              }));
                            } else {
                              setNewProject(prev => ({
                                ...prev,
                                qualificationObjectIds: prev.qualificationObjectIds.filter(id => id !== obj.id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{objectName}</div>
                          <div className="text-xs text-gray-500">
                            {QualificationObjectTypeLabels[obj.type]}
                            {obj.address && ` • ${obj.address}`}
                            {obj.vin && ` • VIN: ${obj.vin}`}
                            {obj.serialNumber && ` • S/N: ${obj.serialNumber}`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  {getQualificationObjectsForContractor(newProject.contractorId).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">У выбранного контрагента нет объектов квалификации</p>
                      <p className="text-xs mt-1">Сначала добавьте объекты в справочнике контрагентов</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-500 text-center">
                    Сначала выберите контрагента для отображения объектов квалификации
                  </p>
                </div>
              )}
              {newProject.contractorId && newProject.qualificationObjectIds.length > 0 && (
                <div className="mt-2 text-sm text-green-600">
                  Выбрано объектов: {newProject.qualificationObjectIds.length}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddProject}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Создание...' : 'Создать проект'}
            </button>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Загрузка проектов...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="overflow-x-auto">
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
                    Объекты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Договор
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.id ? (
                        <textarea
                          value={editProject.description}
                          onChange={(e) => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          rows={2}
                          placeholder="Описание"
                        />
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          {project.description && (
                            <div className="text-xs text-gray-500 mt-1">{project.description}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Создан: {project.createdAt.toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{project.contractorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.id ? (
                        <select
                          value={editProject.status}
                          onChange={(e) => setEditProject(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {Object.entries(ProjectStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(project.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ProjectStatusColors[project.status]}`}>
                            {ProjectStatusLabels[project.status]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {project.qualificationObjects.length} объект(ов)
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.qualificationObjects.slice(0, 2).map(obj => obj.qualificationObjectName).join(', ')}
                        {project.qualificationObjects.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProject === project.id ? (
                        <input
                          type="text"
                          value={editProject.contractNumber}
                          onChange={(e) => setEditProject(prev => ({ ...prev, contractNumber: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="№ договора"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">
                          {project.contractNumber || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingProject === project.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={operationLoading}
                            className="text-green-600 hover:text-green-900"
                            title="Сохранить"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProject(null)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Отмена"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditProject(project)}
                            disabled={operationLoading}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={operationLoading}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {searchTerm ? (
              <>
                <p>По запросу "{searchTerm}" ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить поисковый запрос</p>
              </>
            ) : (
              <>
                <p>Проекты не найдены</p>
                <p className="text-sm">Нажмите кнопку "Создать проект" для создания первого проекта</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика проектов</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{projects.length}</div>
            <div className="text-sm text-gray-500">Всего проектов</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {projects.filter(p => ['contract_negotiation', 'protocol_preparation', 'testing_execution', 'report_preparation', 'report_approval', 'report_printing'].includes(p.status)).length}
            </div>
            <div className="text-sm text-gray-500">В работе</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {projects.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Завершено</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {projects.reduce((sum, p) => sum + p.qualificationObjects.length, 0)}
            </div>
            <div className="text-sm text-gray-500">Объектов в проектах</div>
          </div>
        </div>
      </div>
    </div>
  );
};