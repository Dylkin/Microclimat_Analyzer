import React, { useState } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Project, ProjectType } from '../types/Project';
import { X, MapPin, Thermometer, FileText, Calendar, User, DollarSign } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { createProject, templates } = useProjects();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'mapping' as ProjectType,
    clientName: '',
    estimatedDuration: 14,
    budget: '',
    priority: 'medium' as Project['priority'],
    tags: '',
    roomArea: '',
    loggerCount: '',
    testingDuration: '',
    specialRequirements: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const projectTypes = [
    { value: 'mapping', label: 'Картирование', icon: MapPin, description: 'Картирование температурных условий' },
    { value: 'testing', label: 'Испытания', icon: Thermometer, description: 'Испытания климатического оборудования' },
    { value: 'full_qualification', label: 'Полная квалификация', icon: FileText, description: 'Комплексная квалификация помещений' }
  ];

  const priorities = [
    { value: 'low', label: 'Низкий', color: 'text-green-600' },
    { value: 'medium', label: 'Средний', color: 'text-yellow-600' },
    { value: 'high', label: 'Высокий', color: 'text-orange-600' },
    { value: 'urgent', label: 'Срочный', color: 'text-red-600' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название проекта обязательно';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание проекта обязательно';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Имя заказчика обязательно';
    }

    if (formData.estimatedDuration < 1) {
      newErrors.estimatedDuration = 'Длительность должна быть больше 0';
    }

    if (formData.budget && isNaN(Number(formData.budget))) {
      newErrors.budget = 'Бюджет должен быть числом';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        status: 'draft',
        clientId: Date.now().toString(), // В реальном приложении - ID из системы
        clientName: formData.clientName.trim(),
        managerId: user?.id || '',
        managerName: user?.fullName || '',
        estimatedDuration: formData.estimatedDuration,
        budget: formData.budget ? Number(formData.budget) : undefined,
        currentStage: 'preparation',
        progress: 0,
        priority: formData.priority,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        metadata: {
          roomArea: formData.roomArea ? Number(formData.roomArea) : undefined,
          loggerCount: formData.loggerCount ? Number(formData.loggerCount) : undefined,
          testingDuration: formData.testingDuration ? Number(formData.testingDuration) : undefined,
          specialRequirements: formData.specialRequirements ? 
            formData.specialRequirements.split(',').map(req => req.trim()).filter(Boolean) : []
        }
      };

      await createProject(projectData);
      onClose();
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      setErrors({ submit: 'Ошибка при создании проекта' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedTemplate = templates.find(t => t.type === formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Создать новый проект</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название проекта *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите название проекта"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заказчик *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.clientName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Название организации или ФИО"
              />
              {errors.clientName && <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>}
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание проекта *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Опишите цели и задачи проекта"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>

          {/* Project Type */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Тип проекта</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projectTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    className={`relative rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('type', type.value)}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-6 h-6 ${
                          formData.type === type.value ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{type.label}</h4>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={() => handleInputChange('type', type.value)}
                      className="absolute top-4 right-4"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Параметры проекта</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Длительность (дни) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.estimatedDuration && <p className="mt-1 text-sm text-red-600">{errors.estimatedDuration}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Бюджет (руб.)
              </label>
              <input
                type="number"
                min="0"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.budget ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ориентировочный бюджет"
              />
              {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Приоритет
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Теги (через запятую)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="фармацевтика, склад, холодильник"
              />
            </div>
          </div>

          {/* Technical Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Технические параметры</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Площадь помещения (м²)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.roomArea}
                onChange={(e) => handleInputChange('roomArea', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Общая площадь"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Количество логгеров
              </label>
              <input
                type="number"
                min="0"
                value={formData.loggerCount}
                onChange={(e) => handleInputChange('loggerCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Планируемое количество"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Длительность испытаний (часы)
              </label>
              <input
                type="number"
                min="0"
                value={formData.testingDuration}
                onChange={(e) => handleInputChange('testingDuration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Время непрерывного мониторинга"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Особые требования
              </label>
              <input
                type="text"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Через запятую: стерильность, взрывобезопасность"
              />
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Этапы проекта (по шаблону "{selectedTemplate.name}")
              </h4>
              <div className="space-y-2">
                {selectedTemplate.stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        (~{stage.estimatedDuration} дней)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Создание...</span>
                </>
              ) : (
                <span>Создать проект</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};