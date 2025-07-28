import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, Upload, BarChart3, FileText, Thermometer } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { user, signOut } = useAuth();

  const canAccessUsers = user?.role === 'administrator' || user?.role === 'manager';
  const canAccessUpload = user?.role === 'administrator' || user?.role === 'manager' || user?.role === 'specialist';
  const canAccessAnalysis = user?.role === 'administrator' || user?.role === 'specialist';

  const menuItems = [
    {
      id: 'users',
      label: 'Справочник пользователей',
      icon: Users,
      visible: canAccessUsers
    },
    {
      id: 'upload',
      label: 'Загрузка файлов',
      icon: Upload,
      visible: canAccessUpload
    },
    {
      id: 'analysis',
      label: 'Исследование данных',
      icon: BarChart3,
      visible: canAccessAnalysis
    },
    {
      id: 'reports',
      label: 'Результаты испытаний',
      icon: FileText,
      visible: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Thermometer className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Microclimat Analyzer</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.full_name} ({user?.role === 'administrator' ? 'Администратор' : 
                  user?.role === 'manager' ? 'Руководитель' : 'Специалист'})
              </span>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <ul className="space-y-2">
                {menuItems.filter(item => item.visible).map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onPageChange(item.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === item.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}