import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, Save, X, Search, Building2, CheckCircle, Clock, AlertCircle, Play, FileText, AlertTriangle, Calendar, Printer, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { Project, ProjectStatus, ProjectStatusLabels, ProjectStatusColors, ProjectType, ProjectTypeLabels } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { projectService } from '../utils/projectService';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { useAuth } from '../contexts/AuthContext';
import { SaleProjectForm } from './SaleProjectForm';
// import { QualificationObjectForm } from './QualificationObjectForm';

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

interface ProjectDirectoryProps {
  onPageChange?: (page: string, projectData?: any) => void;
}

const ProjectDirectory: React.FC<ProjectDirectoryProps> = ({ onPageChange }) => {
  const { user } = useAuth();
  const canEditDeleteProjects = (user?.role || '').toLowerCase() !== 'specialist';
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'tenderDate'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // UI state
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newProject, setNewProject] = useState<{
    description: string;
    contractorId: string;
    qualificationObjectIds: string[];
    type?: 'qualification' | 'sale';
  }>({
    description: '',
    contractorId: '',
    qualificationObjectIds: []
  });

  const [editProject, setEditProject] = useState<{
    description: string;
    status: ProjectStatus;
    qualificationObjectIds: string[];
  }>({
    description: '',
    status: 'contract_negotiation',
    qualificationObjectIds: []
  });

  const getDateMs = (v: unknown): number | null => {
    if (!v) return null;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string' || typeof v === 'number') {
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : null;
    }
    return null;
  };

  const sortProjects = (
    items: Project[],
    column: 'createdAt' | 'tenderDate',
    direction: 'asc' | 'desc'
  ) => {
    const sorted = [...items].sort((a, b) => {
      const aValue = column === 'createdAt' ? getDateMs(a.createdAt) : getDateMs((a as any).tenderDate);
      const bValue = column === 'createdAt' ? getDateMs(b.createdAt) : getDateMs((b as any).tenderDate);

      // Пустые даты всегда внизу
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      return aValue - bValue;
    });
    return direction === 'asc' ? sorted : sorted.reverse();
  };

  const qualificationContractors = contractors.filter((c) => (c.role || []).includes('buyer'));

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем проекты
      try {
        const projectsData = await projectService.getAllProjects();
        // При открытии страницы по умолчанию: сначала более поздние → затем более ранние
        const sortedOnLoad = sortProjects(projectsData, 'createdAt', 'desc');
        setSortColumn('createdAt');
        setSortDirection('desc');
        setProjects(sortedOnLoad);
        setFilteredProjects(sortedOnLoad);
      } catch (projectError) {
        console.error('Ошибка загрузки проектов:', projectError);
        throw new Error(`Ошибка загрузки проектов: ${projectError instanceof Error ? projectError.message : 'Неизвестная ошибка'}`);
      }

      // Загружаем контрагентов
      try {
        const contractorsData = await contractorService.getAllContractors();
        // Фильтруем контрагентов с валидными UUID
        const validContractors = contractorsData.filter(contractor => {
          const isValid = isValidUUID(contractor.id);
          if (!isValid) {
            console.warn(`Контрагент "${contractor.name}" имеет некорректный UUID: "${contractor.id}"`);
          }
          return isValid;
        });
        setContractors(validContractors);
      } catch (contractorError) {
        console.error('Ошибка загрузки контрагентов:', contractorError);
        throw new Error(`Ошибка загрузки контрагентов: ${contractorError instanceof Error ? contractorError.message : 'Неизвестная ошибка'}`);
      }

      // Загружаем все объекты квалификации
      try {
        const objectsData = await qualificationObjectService.getAllQualificationObjects();
        setQualificationObjects(objectsData);
      } catch (objectError) {
        console.error('Ошибка загрузки объектов квалификации:', objectError);
        // Не прерываем загрузку из-за ошибки объектов квалификации
        console.warn('Продолжаем работу без объектов квалификации');
        setQualificationObjects([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

      // Формируем понятное сообщение об ошибке
      if (errorMessage.includes('fetch') || errorMessage.includes('JSON') || errorMessage.includes('network')) {
        setError('Ошибка подключения к серверу. Проверьте, что сервер запущен и доступен.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Поиск по проектам
  useEffect(() => {
    let filtered = projects;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = projects.filter(project => {
        return (
          project.name.toLowerCase().includes(searchLower) ||
          (project.description && project.description.toLowerCase().includes(searchLower)) ||
          (project.contractorName && project.contractorName.toLowerCase().includes(searchLower)) ||
          (project.contractNumber && project.contractNumber.toLowerCase().includes(searchLower)) ||
          ProjectStatusLabels[project.status].toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredProjects(sortProjects(filtered, sortColumn, sortDirection));
  }, [searchTerm, projects, sortColumn, sortDirection]);

  // Получение объектов квалификации для выбранного контрагента
  const getQualificationObjectsForContractor = (contractorId: string) => {
    return qualificationObjects.filter(obj => obj.contractorId === contractorId);
  };

  // Добавление проекта
  const handleAddProject = async () => {
    console.log('=== ОТЛАДКА СОЗДАНИЯ ПРОЕКТА ===');
    console.log('Данные нового проекта:', newProject);
    console.log('ID контрагента:', newProject.contractorId);
    console.log('Тип ID контрагента:', typeof newProject.contractorId);
    console.log('Все доступные контрагенты:', contractors.map(c => ({ id: c.id, name: c.name })));

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

    if (!isValidUUID(trimmedContractorId)) {
      console.error('Некорректный UUID контрагента:', trimmedContractorId);
      console.error('Доступные контрагенты с валидными UUID:', contractors);
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

    if (newProject.type === 'qualification' && !(selectedContractor.role || []).includes('buyer')) {
      alert('Для проекта квалификации можно выбрать только контрагента с ролью "Покупатель".');
      return;
    }

    console.log('ID найденного контрагента:', selectedContractor.id);
    console.log('Тип ID найденного контрагента:', typeof selectedContractor.id);

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
    const invalidQualificationObjectIds = newProject.qualificationObjectIds.filter(id => !isValidUUID(id));
    if (invalidQualificationObjectIds.length > 0) {
      console.error('Некорректные UUID объектов квалификации:', invalidQualificationObjectIds);
      console.error('Все объекты квалификации для контрагента:', getQualificationObjectsForContractor(trimmedContractorId));
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

      // Final validation before database call
      console.log('=== FINAL VALIDATION BEFORE DATABASE CALL ===');
      console.log('Final projectData.contractorId:', projectData.contractorId);
      console.log('Type:', typeof projectData.contractorId);
      console.log('Is valid UUID:', isValidUUID(projectData.contractorId));
      console.log('Final projectData.qualificationObjectIds:', projectData.qualificationObjectIds);
      console.log('All qualification object IDs are valid UUIDs:', projectData.qualificationObjectIds.every(id => isValidUUID(id)));

      // Double-check UUID validity one more time
      if (!isValidUUID(projectData.contractorId)) {
        console.error('CRITICAL: Invalid UUID detected right before database call:', projectData.contractorId);
        alert('Критическая ошибка: некорректный ID контрагента. Обратитесь к администратору.');
        return;
      }

      // Validate all qualification object IDs one more time
      const finalInvalidIds = projectData.qualificationObjectIds.filter(id => !isValidUUID(id));
      if (finalInvalidIds.length > 0) {
        console.error('CRITICAL: Invalid qualification object UUIDs detected right before database call:', finalInvalidIds);
        alert('Критическая ошибка: некорректные ID объектов квалификации. Обратитесь к администратору.');
        return;
      }

      const createdProject = await projectService.addProject(projectData, user?.id);
      setProjects(prev => [...prev, createdProject]);
      setNewProject({
        description: '',
        contractorId: '',
        qualificationObjectIds: []
      });
      setShowAddForm(false);
      alert('Проект успешно создан');
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      alert(`Ошибка создания проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование проекта
  const handleEditProject = (project: Project) => {
    if (!canEditDeleteProjects) return;
    setEditProject({
      description: project.description || '',
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
      case 'documents_submission':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'contract_negotiation':
      case 'report_approval':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      // case 'protocol_preparation': // Удалено - статус больше не используется
      case 'report_preparation':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'testing_execution':
        return <Play className="w-4 h-4 text-purple-600" />;
      case 'report_printing':
        return <Printer className="w-4 h-4 text-green-600" />;
      case 'not_suitable':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  // Получение действия для статуса проекта
  const getProjectAction = (status: ProjectStatus, projectType?: ProjectType) => {
    // Для проектов типа 'qualification' не показываем действие для статуса 'documents_submission'
    if (status === 'documents_submission' && projectType === 'qualification') {
      return null;
    }

    switch (status) {
      case 'documents_submission':
        return {
          label: 'Подача документов',
          page: 'documents_submission',
          icon: FileText
        };
      case 'contract_negotiation':
        return {
          label: 'Согласование договора',
          page: 'contract_negotiation',
          icon: FileText
        };
      case 'testing_execution':
        return {
          label: 'Проведение испытаний',
          page: 'testing_execution',
          icon: Play
        };
      case 'report_preparation':
        return {
          label: 'Подготовка отчета',
          page: 'creating_report',
          icon: FileText
        };
      case 'report_approval':
        return {
          label: 'Согласование отчета',
          page: 'report_approval',
          icon: CheckCircle
        };
      case 'report_printing':
        return {
          label: 'Печать отчета',
          page: 'report_printing',
          icon: Printer
        };
      case 'not_suitable':
        return {
          label: 'Не подходит',
          page: 'not_suitable',
          icon: AlertCircle
        };
      case 'completed':
        return {
          label: 'Просмотр проекта',
          page: 'project_view',
          icon: Eye
        };
      default:
        return null;
    }
  };

  // Обработчик действия проекта
  const handleProjectAction = (project: Project) => {
    const action = getProjectAction(project.status);
    if (action && onPageChange) {
      // Передаем данные проекта при переходе
      const projectData = {
        id: project.id,
        name: project.name,
        description: project.description,
        contractorId: project.contractorId,
        contractorName: project.contractorName,
        contractNumber: project.contractNumber,
        contractDate: project.contractDate,
        qualificationObjects: project.qualificationObjects,
        items: project.items,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
      onPageChange(action.page, projectData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setNewProject({ description: '', contractorId: '', qualificationObjectIds: [], type: 'qualification' });
              setShowAddForm(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Квалификация</span>
          </button>
          <button
            onClick={() => {
              setNewProject({ description: '', contractorId: '', qualificationObjectIds: [], type: 'sale' });
              setShowAddForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Продажа</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {!showAddForm && (
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
      )}

      {/* Add Project Form */}
      {showAddForm && newProject.type === 'sale' ? (
        <SaleProjectForm
          contractors={contractors}
          onSave={async (projectData) => {
            setOperationLoading(true);
            try {
              const addedProject = await projectService.addProject(projectData, user?.id);
              setProjects(prev => [...prev, addedProject]);
              setNewProject({ description: '', contractorId: '', qualificationObjectIds: [], type: undefined });
              setShowAddForm(false);
            } catch (error: any) {
              console.error('Ошибка создания проекта:', error);
              setError(error?.message || 'Ошибка создания проекта');
            } finally {
              setOperationLoading(false);
            }
          }}
          onCancel={() => {
            setNewProject({ description: '', contractorId: '', qualificationObjectIds: [], type: undefined });
            setShowAddForm(false);
          }}
          loading={operationLoading}
        />
      ) : showAddForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Квалификация</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Закрыть"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Контрагент */}
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
                required
                title="Выберите контрагента"
                aria-label="Выберите контрагента"
              >
                <option value="">Выберите контрагента</option>
                {qualificationContractors.map(contractor => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Описание */}
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
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {getQualificationObjectsForContractor(newProject.contractorId).map(obj => {
                    const objectName = obj.name || obj.vin || obj.serialNumber || 'Без названия';
                    return (
                      <label key={obj.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
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
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddProject}
                disabled={operationLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {operationLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Projects List */}
      {!showAddForm && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Загрузка проектов...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortColumn === 'createdAt') {
                            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortColumn('createdAt');
                            setSortDirection('desc');
                          }
                        }}
                        className="flex items-center space-x-1 hover:text-gray-700"
                        title={
                          sortColumn === 'createdAt' && sortDirection === 'asc'
                            ? 'Сортировка: сначала ранние (нажмите для смены)'
                            : 'Сортировка: сначала поздние (нажмите для смены)'
                        }
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Дата создания</span>
                        {sortColumn === 'createdAt' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : sortColumn === 'createdAt' ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortColumn === 'tenderDate') {
                            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortColumn('tenderDate');
                            setSortDirection('desc');
                          }
                        }}
                        className="flex items-center space-x-1 hover:text-gray-700"
                        title={
                          sortColumn === 'tenderDate' && sortDirection === 'asc'
                            ? 'Сортировка: сначала ранние (нажмите для смены)'
                            : 'Сортировка: сначала поздние (нажмите для смены)'
                        }
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Дата тендера</span>
                        {sortColumn === 'tenderDate' && sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : sortColumn === 'tenderDate' ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : null}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Проект
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Контрагент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
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
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-900">
                            {project.createdAt.toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-900">
                            {project.tenderDate ? project.tenderDate.toLocaleDateString('ru-RU') : '—'}
                          </div>
                        </div>
                      </td>
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
                            <div
                              className="text-sm font-medium text-gray-900 cursor-help"
                              title={project.name}
                            >
                              {project.name.length > 30 ? `${project.name.substring(0, 30)}...` : project.name}
                            </div>
                            {project.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {project.description.length > 35
                                  ? `${project.description.substring(0, 35)}...`
                                  : project.description}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {ProjectTypeLabels[project.type || 'qualification']}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span
                            className="text-sm text-gray-900 cursor-help"
                            title={project.contractorName || ''}
                          >
                            {project.contractorName && project.contractorName.length > 30
                              ? `${project.contractorName.substring(0, 30)}...`
                              : project.contractorName || ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingProject === project.id ? (
                          <select
                            value={editProject.status}
                            onChange={(e) =>
                              setEditProject((prev) => ({
                                ...prev,
                                status: e.target.value as ProjectStatus,
                              }))
                            }
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            title="Статус проекта"
                            aria-label="Статус проекта"
                          >
                            {Object.entries(ProjectStatusLabels)
                              .filter(([value]) => {
                                // Для проектов типа 'sale' показываем только определенные статусы
                                if (project.type === 'sale') {
                                  return value === 'documents_submission' ||
                                    value === 'contract_negotiation' ||
                                    value === 'not_suitable';
                                }
                                // Для проектов типа 'qualification' исключаем статус 'documents_submission'
                                if (project.type === 'qualification') {
                                  return value !== 'documents_submission';
                                }
                                // Для остальных типов показываем все статусы
                                return true;
                              })
                              .map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(project.status)}
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ProjectStatusColors[project.status]}`}
                            >
                              {ProjectStatusLabels[project.status]}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingProject === project.id && canEditDeleteProjects ? (
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
                            {getProjectAction(project.status, project.type) && (
                              <button
                                onClick={() => handleProjectAction(project)}
                                disabled={operationLoading}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={getProjectAction(project.status, project.type)?.label}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Выполнить
                              </button>
                            )}
                            {canEditDeleteProjects && (
                              <>
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
                              </>
                            )}
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
                  <p className="text-sm">Нажмите кнопку "Квалификация" для создания первого проекта</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

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
              {projects.filter(p => ['contract_negotiation', 'testing_execution', 'report_approval', 'report_printing'].includes(p.status)).length}
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

export default ProjectDirectory;