import React from 'react';
import { Project } from '../types/Project';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';

interface ProjectDashboardProps {
  projects: Project[];
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ projects }) => {
  // Статистика по статусам
  const statusStats = React.useMemo(() => {
    const stats = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      color: getStatusColor(status)
    }));
  }, [projects]);

  // Статистика по типам проектов
  const objectTypeStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    
    projects.forEach(project => {
      if (project.qualificationObjects) {
        project.qualificationObjects.forEach(obj => {
          const typeName = getObjectTypeText(obj.type);
          stats[typeName] = (stats[typeName] || 0) + 1;
        });
      }
    });

    return Object.entries(stats).map(([type, count]) => ({
      name: type,
      value: count
    }));
  }, [projects]);

  // Статистика по месяцам (последние 6 месяцев)
  const monthlyStats = React.useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthProjects = projects.filter(project => {
        const projectDate = new Date(project.createdAt);
        const projectKey = `${projectDate.getFullYear()}-${String(projectDate.getMonth() + 1).padStart(2, '0')}`;
        return projectKey === monthKey;
      });

      months.push({
        month: date.toLocaleDateString('ru-RU', { month: 'short' }),
        created: monthProjects.length,
        completed: monthProjects.filter(p => p.status === 'completed').length
      });
    }
    
    return months;
  }, [projects]);

  // Общая статистика
  const totalStats = React.useMemo(() => {
    const active = projects.filter(p => ['preparation', 'testing', 'reporting'].includes(p.status)).length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const overdue = projects.filter(p => 
      p.endDate && 
      new Date(p.endDate) < new Date() && 
      p.status !== 'completed'
    ).length;
    
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const avgProgress = projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0;

    return {
      total: projects.length,
      active,
      completed,
      overdue,
      totalBudget,
      avgProgress
    };
  }, [projects]);

  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'Черновик',
      preparation: 'Подготовка',
      testing: 'Испытания',
      reporting: 'Отчетность',
      completed: 'Завершен',
      cancelled: 'Отменен',
      on_hold: 'Приостановлен'
    };
    return statusMap[status] || status;
  }

  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      draft: '#6B7280',
      preparation: '#3B82F6',
      testing: '#F59E0B',
      reporting: '#8B5CF6',
      completed: '#10B981',
      cancelled: '#EF4444',
      on_hold: '#F97316'
    };
    return colorMap[status] || '#6B7280';
  }

  function getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      mapping: 'Картирование',
      testing: 'Испытания',
      full_qualification: 'Полная квалификация'
    };
    return typeMap[type] || type;
  }

  function getObjectTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      room: 'Помещение',
      transport: 'Транспорт',
      refrigerator: 'Холодильные камеры',
      cooling_unit: 'Холодильные установки',
      freezing_unit: 'Морозильные установки'
    };
    return typeMap[type] || type;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Всего проектов</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Активные</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Завершенные</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Просроченные</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Распределение по статусам</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {statusStats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stat.color }}
                ></div>
                <span className="text-sm text-gray-600">{stat.name}: {stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Types */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Типы объектов квалификации</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectTypeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Динамика проектов</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="created" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Создано"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Завершено"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Средний прогресс</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStats.avgProgress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Общий бюджет</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalStats.totalBudget.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Средняя длительность</p>
              <p className="text-2xl font-semibold text-gray-900">
                {projects.length > 0 
                  ? Math.round(projects.reduce((sum, p) => sum + p.estimatedDuration, 0) / projects.length)
                  : 0
                } дней
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Последние проекты</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Проект
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Заказчик
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Прогресс
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создан
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Картирование для {project.clientName}</div>
                        <div className="text-sm text-gray-500">{getTypeText(project.type)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        style={{ 
                          backgroundColor: getStatusColor(project.status) + '20',
                          color: getStatusColor(project.status)
                        }}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};