import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from './UserManagement';
import { ContractorManagement } from './ContractorManagement';
import { Users, Settings, Building2 } from 'lucide-react';

type ReferenceBookType = 'users' | 'contractors' | 'settings';

interface ReferenceBook {
  id: ReferenceBookType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const referenceBooks: ReferenceBook[] = [
  {
    id: 'users',
    name: 'Пользователи',
    icon: Users,
    description: 'Управление пользователями системы'
  },
  {
    id: 'contractors',
    name: 'Контрагенты',
    icon: Building2,
    description: 'Управление контрагентами и их контактными лицами'
  },
  {
    id: 'contractors',
    name: 'Контрагенты',
    icon: Building2,
    description: 'Управление контрагентами и их контактными лицами'
  },
  {
    id: 'settings',
    name: 'Настройки системы',
    icon: Settings,
    description: 'Общие настройки приложения'
  }
];

// Системные настройки
interface SystemSetting {
  key: string;
  name: string;
  value: string;
  category: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

const defaultSettings: SystemSetting[] = [
  {
    key: 'company_name',
    name: 'Название компании',
    value: 'ООО "Квалификация"',
    category: 'general',
    description: 'Название компании для отчетов',
    type: 'text'
  },
  {
    key: 'default_project_duration',
    name: 'Длительность проекта по умолчанию (дни)',
    value: '14',
    category: 'projects',
    description: 'Стандартная длительность нового проекта',
    type: 'number'
  },
  {
    key: 'auto_assign_manager',
    name: 'Автоматическое назначение менеджера',
    value: 'true',
    category: 'projects',
    description: 'Автоматически назначать текущего пользователя менеджером проекта',
    type: 'boolean'
  },
  {
    key: 'notification_email',
    name: 'Email для уведомлений',
    value: 'admin@company.com',
    category: 'notifications',
    description: 'Email для системных уведомлений',
    type: 'text'
  }
];

export const ReferenceBooks: React.FC = () => {
  const { user } = useAuth();
  const [activeBook, setActiveBook] = useState<ReferenceBookType>('users');
  const [settings, setSettings] = useState<SystemSetting[]>(defaultSettings);

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  const renderBookContent = () => {
    switch (activeBook) {
      case 'users':
        return <UserManagement />;
      case 'contractors':
        return <ContractorManagement />;
      case 'contractors':
        return <ContractorManagement />;
      case 'settings':
        return renderSettingsBook();
      default:
        return <UserManagement />;
    }
  };

  const renderSettingsBook = () => {
    const categories = [...new Set(settings.map(s => s.category))];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Настройки системы</h2>
        </div>

        {categories.map(category => (
          <div key={category} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
              {category === 'general' && 'Общие'}
              {category === 'projects' && 'Проекты'}
              {category === 'notifications' && 'Уведомления'}
              {category === 'measurements' && 'Измерения'}
            </h3>
            
            <div className="space-y-4">
              {settings.filter(s => s.category === category).map(setting => (
                <div key={setting.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.name}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    {setting.type === 'boolean' ? (
                      <select
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={user?.role !== 'administrator'}
                      >
                        <option value="true">Включено</option>
                        <option value="false">Отключено</option>
                      </select>
                    ) : setting.type === 'select' ? (
                      <select
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={user?.role !== 'administrator'}
                      >
                        {setting.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={user?.role !== 'administrator'}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {user?.role !== 'administrator' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Только администраторы могут изменять настройки системы
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Справочники</h1>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {referenceBooks.map((book) => {
              const Icon = book.icon;
              return (
                <button
                  key={book.id}
                  onClick={() => setActiveBook(book.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeBook === book.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{book.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderBookContent()}
        </div>
      </div>
    </div>
  );
};