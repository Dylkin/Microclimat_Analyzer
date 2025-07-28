import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Upload, 
  Search, 
  Shield,
  UserCheck,
  Settings
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const roleIcons = {
    administrator: Shield,
    manager: UserCheck,
    specialist: Settings
  };

  const roleLabels = {
    administrator: 'Администратор',
    manager: 'Руководитель',
    specialist: 'Специалист'
  };

  const roleColors = {
    administrator: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    specialist: 'bg-green-100 text-green-800'
  };

  const permissions = [
    {
      name: 'Справочник пользователей',
      key: 'users' as const,
      icon: Users,
      description: 'Управление пользователями системы'
    },
    {
      name: 'Загрузка файлов',
      key: 'files' as const,
      icon: Upload,
      description: 'Загрузка файлов для анализа'
    },
    {
      name: 'Исследование файлов',
      key: 'research' as const,
      icon: Search,
      description: 'Анализ и исследование данных'
    }
  ];

  if (!user) return null;

  const RoleIcon = roleIcons[user.role];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Добро пожаловать в Microclimat Analyzer
        </h1>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <RoleIcon className="w-6 h-6 text-gray-600" />
            <span className="text-lg font-medium text-gray-900">{user.full_name}</span>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleColors[user.role]}`}>
            {roleLabels[user.role]}
          </span>
        </div>

        <p className="text-gray-600 mb-6">
          Система анализа микроклимата предназначена для обработки и исследования данных 
          о климатических условиях. Ваши права доступа определяются назначенной ролью.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Доступные функции</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {permissions.map((permission) => {
            const hasAccess = hasPermission(permission.key);
            const Icon = permission.icon;
            
            return (
              <div
                key={permission.key}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  hasAccess
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className={`w-6 h-6 ${hasAccess ? 'text-green-600' : 'text-gray-400'}`} />
                  <h3 className={`font-medium ${hasAccess ? 'text-green-900' : 'text-gray-500'}`}>
                    {permission.name}
                  </h3>
                </div>
                <p className={`text-sm ${hasAccess ? 'text-green-700' : 'text-gray-500'}`}>
                  {permission.description}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    hasAccess
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {hasAccess ? 'Доступно' : 'Недоступно'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Матрица прав доступа</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователи
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Загрузка файлов
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Исследование
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Администратор
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Руководитель
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-red-600 font-medium">✗</span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Settings className="w-3 h-3 mr-1" />
                    Специалист
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-red-600 font-medium">✗</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-green-600 font-medium">✓</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};