import React, { useState } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Project, ProjectType, QualificationObject, QualificationObjectType } from '../types/Project';
import { createQualificationStages } from '../utils/qualificationStages';
import { ArrowLeft, MapPin, Calendar, User, DollarSign, Plus, Trash2, Building, Truck, Snowflake, Save } from 'lucide-react';
import { clientService, Client } from '../services/clientService';

interface CreateProjectFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onCancel, onSuccess }) => {
  const { user } = useAuth();
  const { createProject, templates } = useProjects();
  
  const [formData, setFormData] = useState({
    description: '',
    clientId: '',
    clientName: '', 
  });

  const [qualificationObjects, setQualificationObjects] = useState<Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    inn: '',
    kpp: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const qualificationObjectTypes = [
    { value: 'room', label: 'Помещение', icon: Building },
    { value: 'automobile', label: 'Автомобиль', icon: Truck },
    { value: 'refrigerator_chamber', label: 'Холодильная камера', icon: Snowflake },
    { value: 'refrigerator', label: 'Холодильник', icon: Snowflake },
    { value: 'freezer', label: 'Морозильник', icon: Snowflake },
    { value: 'thermocontainer', label: 'Термоконтейнер', icon: Snowflake }
  ];

  // Загружаем клиентов при монтировании компонента
  React.useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId && !formData.clientName.trim()) {
      newErrors.client = 'Выберите заказчика или добавьте нового';
    }

    if (qualificationObjects.length === 0) {
      newErrors.objects = 'Добавьте хотя бы один объект квалификации';
    }

    // Проверка на дублирование проектов
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const clientName = selectedClient?.name || formData.clientName.trim();
    
    // Проверяем дублирование проектов (будет работать после подключения к БД)
    // Пока оставляем заготовку для будущей реализации

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.inn) {
      setErrors({ newClient: 'Заполните обязательные поля для нового заказчика' });
      return;
    }

    try {
      const client = await clientService.createClient({
        name: newClient.name,
        contactPerson: newClient.contactPerson,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
        inn: newClient.inn,
        kpp: newClient.kpp
      });

      setClients(prev => [...prev, client]);
      setFormData(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
      setShowNewClientForm(false);
      setNewClient({ name: '', contactPerson: '', email: '', phone: '', address: '', inn: '', kpp: '' });
      setErrors({});
    } catch (error) {
      console.error('Error adding client:', error);
      setErrors({ newClient: 'Ошибка добавления клиента' });
    }
  };

  const handleAddQualificationObject = () => {
    const objectId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const startDate = new Date(); // Начинаем от текущей даты
    const newObject: Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'room',
      name: '',
      description: '',
      stages: createQualificationStages(objectId, startDate),
      overallStatus: 'not_started',
      overallProgress: 0,
      technicalParameters: {}
    };
    setQualificationObjects(prev => [...prev, newObject]);
  };

  const handleUpdateQualificationObject = (index: number, updates: Partial<Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setQualificationObjects(prev => prev.map((obj, i) => i === index ? { ...obj, ...updates } : obj));
  };

  const handleRemoveQualificationObject = (index: number) => {
    setQualificationObjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка на дублирование проектов перед созданием
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const clientName = selectedClient?.name || formData.clientName.trim();
    
    try {
      // Проверяем существование проекта с таким же типом и заказчиком
      const existingProject = await projectService.findProjectByClientAndType(clientName, 'mapping');
      if (existingProject) {
        setErrors({ duplicate: `Проект картирования для заказчика "${clientName}" уже существует` });
        return;
      }
    } catch (error) {
      // Если проверка не удалась (например, БД недоступна), продолжаем создание
      console.warn('Could not check for duplicate projects:', error);
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Находим выбранного клиента
      const selectedClient = clients.find(c => c.id === formData.clientId);
      
      const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        description: formData.description.trim() || undefined,
        type: 'mapping',
        status: 'draft',
        clientId: formData.clientId || Date.now().toString(),
        clientName: selectedClient?.name || formData.clientName.trim(),
        managerId: user?.id || '',
        managerName: user?.fullName || '',
        estimatedDuration: 14, // Значение по умолчанию
        budget: undefined,
        currentStage: 'preparation',
        progress: 0,
        priority: 'medium',
        tags: [],
        qualificationObjects: qualificationObjects.map(obj => ({
          ...obj,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          stages: obj.stages.map(stage => ({
            ...stage,
            id: `${obj.id || Date.now()}_stage_${stage.type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
          })),
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      };

      await createProject(projectData);
      onSuccess();
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      setErrors({ submit: 'Ошибка при создании проекта' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'clientId') {
      const selectedClient = clients.find(c => c.id === value);
      setFormData(prev => ({ ...prev, clientId: value, clientName: selectedClient?.name || '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Создать новый проект</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заказчик *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.client ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Выберите заказчика</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errors.client && <p className="mt-1 text-sm text-red-600">{errors.client}</p>}
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание проекта
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Опишите цели и задачи проекта"
              />
            </div>
          </div>

          {/* Actions moved here */}
          <div className="flex items-center justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
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
                <>
                  <Save className="w-4 h-4" />
                  <span>Создать проект</span>
                </>
              )}
            </button>
          </div>

          {/* New Client Form */}
          {showNewClientForm && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Добавить нового заказчика</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо *</label>
                  <input
                    type="text"
                    value={newClient.contactPerson}
                    onChange={(e) => setNewClient(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ИНН *</label>
                  <input
                    type="text"
                    value={newClient.inn}
                    onChange={(e) => setNewClient(prev => ({ ...prev, inn: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">КПП</label>
                  <input
                    type="text"
                    value={newClient.kpp}
                    onChange={(e) => setNewClient(prev => ({ ...prev, kpp: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                  <textarea
                    value={newClient.address}
                    onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddClient}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Добавить
                </button>
              </div>
              {errors.newClient && <p className="mt-2 text-sm text-red-600">{errors.newClient}</p>}
            </div>
          )}
        </div>

        {/* Qualification Objects */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Объекты квалификации</h3>
            <button
              type="button"
              onClick={handleAddQualificationObject}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить объект</span>
            </button>
          </div>
          
          {qualificationObjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Добавьте объекты квалификации</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qualificationObjects.map((obj, index) => (
                <QualificationObjectForm
                  key={index}
                  object={obj}
                  index={index}
                  objectTypes={qualificationObjectTypes}
                  onUpdate={handleUpdateQualificationObject}
                  onRemove={handleRemoveQualificationObject}
                />
              ))}
            </div>
          )}
          {errors.objects && <p className="mt-2 text-sm text-red-600">{errors.objects}</p>}
        </div>

        {/* Project Type Info */}
        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}
        
        {/* Duplicate Error Message */}
        {errors.duplicate && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{errors.duplicate}</p>
          </div>
        )}
      </form>
    </div>
  );
};

// Компонент для редактирования объекта квалификации
interface QualificationObjectFormProps {
  object: Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'>;
  index: number;
  objectTypes: Array<{ value: QualificationObjectType; label: string; icon: any }>;
  onUpdate: (index: number, updates: Partial<Omit<QualificationObject, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onRemove: (index: number) => void;
}

const QualificationObjectForm: React.FC<QualificationObjectFormProps> = ({
  object,
  index,
  objectTypes,
  onUpdate,
  onRemove
}) => {
  const selectedType = objectTypes.find(t => t.value === object.type);
  const Icon = selectedType?.icon || Building;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-indigo-600" />
          <h4 className="text-md font-medium text-gray-900">
            Объект квалификации #{index + 1}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип объекта</label>
          <select
            value={object.type}
            onChange={(e) => onUpdate(index, { type: e.target.value as QualificationObjectType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {objectTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Название объекта"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea
            value={object.description || ''}
            onChange={(e) => onUpdate(index, { description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Описание объекта"
          />
        </div>

        {/* Технические параметры */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Площадь (м²)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={object.technicalParameters.area || ''}
            onChange={(e) => onUpdate(index, {
              technicalParameters: {
                ...object.technicalParameters,
                area: e.target.value ? Number(e.target.value) : undefined
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Количество логгеров</label>
          <input
            type="number"
            min="0"
            value={object.technicalParameters.loggerCount || ''}
            onChange={(e) => onUpdate(index, {
              technicalParameters: {
                ...object.technicalParameters,
                loggerCount: e.target.value ? Number(e.target.value) : undefined
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Длительность испытаний (часы)</label>
          <input
            type="number"
            min="0"
            value={object.technicalParameters.testingDuration || ''}
            onChange={(e) => onUpdate(index, {
              technicalParameters: {
                ...object.technicalParameters,
                testingDuration: e.target.value ? Number(e.target.value) : undefined
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Местоположение</label>
          <input
            type="text"
            value={object.technicalParameters.location || ''}
            onChange={(e) => onUpdate(index, {
              technicalParameters: {
                ...object.technicalParameters,
                location: e.target.value
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Местоположение объекта"
          />
        </div>

        {/* Название климатической установки - для всех типов */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название климатической установки</label>
          <input
            type="text"
            value={object.technicalParameters.climateSystemName || ''}
            onChange={(e) => onUpdate(index, {
              technicalParameters: {
                ...object.technicalParameters,
                climateSystemName: e.target.value
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Название климатической установки"
          />
        </div>

        {/* Инвентарный номер - для помещений и холодильных камер */}
        {(object.type === 'room' || object.type === 'refrigerator_chamber') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Инвентарный номер</label>
            <input
              type="text"
              value={object.technicalParameters.inventoryNumber || ''}
              onChange={(e) => onUpdate(index, {
                technicalParameters: {
                  ...object.technicalParameters,
                  inventoryNumber: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Инвентарный номер"
            />
          </div>
        )}

        {/* Серийный номер - для холодильников, морозильников, термоконтейнеров */}
        {(object.type === 'refrigerator' || object.type === 'freezer' || object.type === 'thermocontainer') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Серийный номер</label>
            <input
              type="text"
              value={object.technicalParameters.serialNumber || ''}
              onChange={(e) => onUpdate(index, {
                technicalParameters: {
                  ...object.technicalParameters,
                  serialNumber: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Серийный номер"
            />
          </div>
        )}

        {/* VIN и регистрационный номер - для автомобилей */}
        {object.type === 'automobile' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN номер</label>
              <input
                type="text"
                value={object.technicalParameters.vin || ''}
                onChange={(e) => onUpdate(index, {
                  technicalParameters: {
                    ...object.technicalParameters,
                    vin: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="VIN номер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Регистрационный номер</label>
              <input
                type="text"
                value={object.technicalParameters.registrationNumber || ''}
                onChange={(e) => onUpdate(index, {
                  technicalParameters: {
                    ...object.technicalParameters,
                    registrationNumber: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Регистрационный номер"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};