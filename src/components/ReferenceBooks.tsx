import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Users, 
  Building2, 
  Wrench, 
  FileText, 
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { clientService, Client } from '../services/clientService';

type ReferenceBookType = 'users' | 'clients' | 'equipment' | 'templates' | 'settings';

interface Equipment {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  type: 'logger' | 'sensor' | 'calibrator' | 'other';
  status: 'active' | 'maintenance' | 'retired';
  calibrationDate?: Date;
  nextCalibrationDate?: Date;
  location: string;
  notes?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'contract' | 'quote' | 'protocol' | 'report' | 'act';
  description: string;
  fileName: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SystemSettings {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
}

export const ReferenceBooks: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [activeBook, setActiveBook] = useState<ReferenceBookType>('users');
  
  // Состояния для справочников
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [settings, setSettings] = useState<SystemSettings[]>([]);
  
  // Состояния для редактирования
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');

  const referenceBooks = [
    {
      key: 'users' as ReferenceBookType,
      name: 'Пользователи',
      icon: Users,
      description: 'Управление пользователями системы',
      access: 'users' as const
    },
    {
      key: 'clients' as ReferenceBookType,
      name: 'Заказчики',
      icon: Building2,
      description: 'Справочник организаций-заказчиков',
      access: 'users' as const
    },
    {
      key: 'equipment' as ReferenceBookType,
      name: 'Оборудование',
      icon: Wrench,
      description: 'Учет логгеров и измерительного оборудования',
      access: 'users' as const
    },
    {
      key: 'templates' as ReferenceBookType,
      name: 'Шаблоны документов',
      icon: FileText,
      description: 'Шаблоны договоров, протоколов и отчетов',
      access: 'users' as const
    },
    {
      key: 'settings' as ReferenceBookType,
      name: 'Настройки системы',
      icon: Settings,
      description: 'Конфигурация системы и параметры',
      access: 'users' as const
    }
  ];

  const availableBooks = referenceBooks.filter(book => hasAccess(book.access));

  // Инициализация данных
  React.useEffect(() => {
    if (activeBook === 'clients') {
      loadClients();
    } else {
      loadReferenceData();
    }
  }, []);

  React.useEffect(() => {
    if (activeBook === 'clients') {
      loadClients();
    }
  }, [activeBook]);

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Ошибка загрузки клиентов');
    }
  };

  const loadReferenceData = () => {
    // Загрузка данных из localStorage для других справочников
    const savedEquipment = localStorage.getItem('equipment');
    const savedTemplates = localStorage.getItem('templates');
    const savedSettings = localStorage.getItem('settings');

    if (savedEquipment) setEquipment(JSON.parse(savedEquipment));
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    else {
      // Настройки по умолчанию
      const defaultSettings: SystemSettings[] = [
        {
          id: '1',
          key: 'max_file_size',
          value: '100',
          description: 'Максимальный размер загружаемого файла (МБ)',
          type: 'number',
          category: 'files'
        },
        {
          id: '2',
          key: 'company_name',
          value: 'ООО "Микроклимат"',
          description: 'Название организации',
          type: 'string',
          category: 'company'
        }
      ];
      setSettings(defaultSettings);
      localStorage.setItem('settings', JSON.stringify(defaultSettings));
    }
  };

  const saveData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Обработчики для заказчиков
  const handleAddClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = await clientService.createClient(clientData);
      setClients(prev => [...prev, newClient]);
      setShowAddForm(false);
      setError('');
    } catch (error) {
      console.error('Error adding client:', error);
      setError('Ошибка добавления клиента');
    }
  };

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    try {
      await clientService.updateClient(id, updates);
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c));
      setEditingItem(null);
      setError('');
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Ошибка обновления клиента');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого заказчика?')) {
      try {
        await clientService.deleteClient(id);
        setClients(prev => prev.filter(c => c.id !== id));
        setError('');
      } catch (error) {
        console.error('Error deleting client:', error);
        setError('Ошибка удаления клиента');
      }
    }
  };

  // Обработчики для оборудования
  const handleAddEquipment = (equipmentData: Omit<Equipment, 'id'>) => {
    const newEquipment: Equipment = {
      ...equipmentData,
      id: Date.now().toString()
    };
    const updatedEquipment = [...equipment, newEquipment];
    setEquipment(updatedEquipment);
    saveData('equipment', updatedEquipment);
    setShowAddForm(false);
  };

  const handleUpdateEquipment = (id: string, updates: Partial<Equipment>) => {
    const updatedEquipment = equipment.map(e => e.id === id ? { ...e, ...updates } : e);
    setEquipment(updatedEquipment);
    saveData('equipment', updatedEquipment);
    setEditingItem(null);
  };

  const handleDeleteEquipment = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить это оборудование?')) {
      const updatedEquipment = equipment.filter(e => e.id !== id);
      setEquipment(updatedEquipment);
      saveData('equipment', updatedEquipment);
    }
  };

  // Рендер содержимого справочника
  const renderBookContent = () => {
    switch (activeBook) {
      case 'users':
        return <UserManagement />;
      
      case 'clients':
        return renderClientsBook();
      
      case 'equipment':
        return renderEquipmentBook();
      
      case 'templates':
        return renderTemplatesBook();
      
      case 'settings':
        return renderSettingsBook();
      
      default:
        return <div>Выберите справочник</div>;
    }
  };

  const renderClientsBook = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Справочник заказчиков</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить заказчика</span>
        </button>
      </div>

      {showAddForm && (
        <ClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Организация
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контактное лицо
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контакты
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-500">{client.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.contactPerson}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.email}</div>
                  <div className="text-sm text-gray-500">{client.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingItem(client)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEquipmentBook = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Справочник оборудования</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить оборудование</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Наименование
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Модель/Серийный номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Калибровка
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {equipment.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.model}</div>
                  <div className="text-sm text-gray-500">S/N: {item.serialNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'active' ? 'bg-green-100 text-green-800' :
                    item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.calibrationDate && (
                    <div className="text-sm text-gray-900">
                      {new Date(item.calibrationDate).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                  {item.nextCalibrationDate && (
                    <div className="text-sm text-gray-500">
                      След: {new Date(item.nextCalibrationDate).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <span className="text-gray-400 text-xs">Функционал в разработке</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTemplatesBook = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Шаблоны документов</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить шаблон</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-indigo-600" />
              <span className={`px-2 py-1 text-xs rounded-full ${
                template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {template.isActive ? 'Активен' : 'Неактивен'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="text-xs text-gray-500 mb-4">
              <div>Тип: {template.type}</div>
              <div>Версия: {template.version}</div>
              <div>Файл: {template.fileName}</div>
            </div>
            <div className="flex justify-end space-x-2">
              <span className="text-gray-400 text-xs">Функционал в разработке</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsBook = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Настройки системы</h2>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {settings.map((setting) => (
            <div key={setting.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{setting.description}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Ключ: {setting.key} | Категория: {setting.category}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-900 font-mono">
                    {setting.value}
                  </div>
                  <span className="text-gray-400 text-xs">Функционал в разработке</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!hasAccess('users')) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Доступ ограничен</h3>
        <p className="text-gray-600">У вас нет прав для просмотра справочников</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <BookOpen className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Справочники</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Разделы</h3>
            </div>
            <nav className="p-2">
              {availableBooks.map((book) => {
                const Icon = book.icon;
                return (
                  <button
                    key={book.key}
                    onClick={() => setActiveBook(book.key)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeBook === book.key
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div>{book.name}</div>
                      <div className="text-xs text-gray-500">{book.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderBookContent()}
        </div>
      </div>
    </div>
  );
};

// Компонент формы для добавления заказчика
const ClientForm: React.FC<{
  onSubmit: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Добавить заказчика</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название организации *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо *</label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="md:col-span-2 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
};