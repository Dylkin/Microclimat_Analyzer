import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, BarChart3, Menu, X, HelpCircle, Database, Users, Building2, FolderOpen, Wrench, Wifi, Shield, User, Key, Activity, Settings, ChevronDown, ChevronRight, Search } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string, projectData?: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { user, logout, hasAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set());

  const navigation = [
    {
      name: 'Пользователи',
      key: 'users',
      icon: Users,
      access: 'users' as const
    },
    {
      name: 'Контрагенты',
      key: 'contractors',
      icon: Building2,
      access: 'analyzer' as const
    },
    {
      name: 'Проекты',
      key: 'projects',
      icon: FolderOpen,
      access: 'analyzer' as const
    },
    {
      name: 'Оборудование',
      key: 'equipment',
      icon: Wrench,
      access: 'analyzer' as const
    },
    {
      name: 'Справка',
      key: 'help',
      icon: HelpCircle,
      access: 'help' as const
    },
    {
      name: 'Сервис',
      key: 'service',
      icon: Settings,
      access: 'analyzer' as const,
      children: [
        {
          name: 'Microclimat Analyzer',
          key: 'analyzer',
          icon: BarChart3,
          access: 'analyzer' as const
        },
        {
          name: 'Аудит',
          key: 'audit_logs',
          icon: Activity,
          access: 'admin' as const
        },
        {
          name: 'Проверка БД',
          key: 'database',
          icon: Database,
          access: 'analyzer' as const
        },
        {
          name: 'Тест Supabase',
          key: 'supabase-test',
          icon: Wifi,
          access: 'analyzer' as const
        },
        {
          name: 'RLS Manager',
          key: 'rls-manager',
          icon: Shield,
          access: 'analyzer' as const
        },
        {
          name: 'Storage RLS Manager',
          key: 'storage-rls-manager',
          icon: Shield,
          access: 'analyzer' as const
        },
        {
          name: 'Storage Diagnostic',
          key: 'storage-diagnostic',
          icon: Database,
          access: 'analyzer' as const
        },
        {
          name: 'Storage Auth Fix',
          key: 'storage-auth-fix',
          icon: User,
          access: 'analyzer' as const
        },
        {
          name: 'Supabase Auth Fix',
          key: 'supabase-auth-init',
          icon: Key,
          access: 'analyzer' as const
        },
        {
          name: 'Secure Auth Manager',
          key: 'secure-auth-manager',
          icon: Shield,
          access: 'analyzer' as const
        },
        {
          name: 'Поиск тендеров',
          key: 'tender-search',
          icon: Search,
          access: 'analyzer' as const
        }
      ]
    }
  ];

  const availableNavigation = navigation.filter(item => hasAccess(item.access));

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
      case 'administrator': return 'Администратор';
      case 'specialist': return 'Специалист';
      case 'manager': return 'Руководитель';
      case 'director': return 'Менеджер';
      default: return role;
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">ComSystem Office</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Закрыть меню"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {availableNavigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.has(item.key);
              
              if (hasChildren) {
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isExpanded && item.children && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.filter(child => hasAccess(child.access)).map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <button
                              key={child.key}
                              onClick={() => {
                                onPageChange(child.key);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === child.key
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 mr-3" />
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onPageChange(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === item.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">ComSystem Office</h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {availableNavigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.has(item.key);
              
              if (hasChildren) {
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isExpanded && item.children && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.filter(child => hasAccess(child.access)).map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <button
                              key={child.key}
                              onClick={() => onPageChange(child.key)}
                              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === child.key
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 mr-3" />
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <button
                  key={item.key}
                  onClick={() => onPageChange(item.key)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === item.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
              title="Открыть меню"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.fullName}</span>
                <span className="ml-2 text-gray-400">({getRoleLabel(user?.role || '')})</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Выйти</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};