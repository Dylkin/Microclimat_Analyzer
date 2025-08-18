import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Users, 
  Building, 
  MapPin, 
  Thermometer,
  Settings,
  Database,
  FileText
} from 'lucide-react';
import { UserManagement } from './UserManagement';

type ReferenceSection = 'users' | 'clients' | 'equipment' | 'locations' | 'templates' | 'settings';

interface ReferenceItem {
  key: ReferenceSection;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  requiredRole?: string[];
}

export const References: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [activeSection, setActiveSection] = useState<ReferenceSection>('users');

  const referenceItems: ReferenceItem[] = [
    {
      key: 'users',
      title: 'Пользователи',
      description: 'Управление пользователями системы',
      icon: Users,
      requiredRole: ['administrator']
    },
    {
      key: 'clients',
      title: 'Заказчики',
      description: 'База данных заказчиков и контактов',
      icon: Building,
      requiredRole: ['administrator', 'manager']
    },
    {
      key: 'equipment',
      title: 'Оборудование',
      description: 'Справочник логгеров и измерительного оборудования',
      icon: Thermometer,
      requiredRole: ['administrator', 'specialist']
    },
    {
      key: 'locations',
      title: 'Локации',
      description: 'Справочник помещений и объектов',
      icon: MapPin,
      requiredRole: ['administrator', 'manager', 'specialist']
    },
    {
      key: 'templates',
      title: 'Шаблоны',
      description: 'Шаблоны документов и отчетов',
      icon: FileText,
      requiredRole: ['administrator', 'manager']
    },
    {
      key: 'settings',
      title: 'Настройки',
      description: 'Системные настройки и конфигурация',
      icon: Settings,
      requiredRole: ['administrator']
    }
  ];

  // Фильтруем справочники по ролям
  const availableReferences = referenceItems.filter(item => {
    if (!item.requiredRole) return true;
    return item.requiredRole.includes(user?.role || '');
  });

  const renderContent = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'clients':
        return <ClientManagement />;
      case 'equipment':
        return <EquipmentManagement />;
      case 'locations':
        return <LocationManagement />;
      case 'templates':
        return <TemplateManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <UserManagement />;
    }
  };

  if (!hasAccess('references')) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Разделы</h3>
            </div>
            <nav className="p-2">
              {availableReferences.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                      activeSection === item.key
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Заглушки для других справочников
const ClientManagement: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-center py-12">
      <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Справочник заказчиков</h3>
      <p className="text-gray-600">Функционал в разработке</p>
    </div>
  </div>
);

const EquipmentManagement: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-center py-12">
      <Thermometer className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Справочник оборудования</h3>
      <p className="text-gray-600">Функционал в разработке</p>
    </div>
  </div>
);

const LocationManagement: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-center py-12">
      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Справочник локаций</h3>
      <p className="text-gray-600">Функционал в разработке</p>
    </div>
  </div>
);

const TemplateManagement: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-center py-12">
      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Шаблоны документов</h3>
      <p className="text-gray-600">Функционал в разработке</p>
    </div>
  </div>
);

const SystemSettings: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="text-center py-12">
      <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Системные настройки</h3>
      <p className="text-gray-600">Функционал в разработке</p>
    </div>
  </div>
);