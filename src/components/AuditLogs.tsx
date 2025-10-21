import React, { useState, useEffect } from 'react';
import { Eye, Filter, Download, Calendar, User, Activity } from 'lucide-react';
import { auditService } from '../utils/auditService';
import { AuditLog, AuditAction, AuditEntityType } from '../types/AuditLog';
import { useAuth } from '../contexts/AuthContext';

interface AuditLogsProps {
  onBack?: () => void;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ onBack }) => {
  const { user, hasAccess } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: '' as AuditAction | '',
    entityType: '' as AuditEntityType | '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  // Проверяем доступ
  if (!hasAccess('admin')) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h1>
              <p className="text-gray-600 mb-6">Только администраторы могут просматривать логи аудита.</p>
              {onBack && (
                <button
                  onClick={onBack}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Назад
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    console.log('AuditLogs: Начинаем загрузку логов с фильтрами:', filters);

    try {
      const logsData = await auditService.getAuditLogs({
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        limit: filters.limit
      });

      console.log('AuditLogs: Получены данные логов:', logsData);
      setLogs(logsData);
    } catch (err) {
      console.error('AuditLogs: Ошибка загрузки логов аудита:', err);
      setError(`Ошибка загрузки логов аудита: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const getActionLabel = (action: AuditAction): string => {
    const labels: Record<AuditAction, string> = {
      document_approved: 'Документ согласован',
      document_rejected: 'Документ отклонен',
      document_approval_cancelled: 'Согласование отменено',
      document_uploaded: 'Документ загружен',
      document_deleted: 'Документ удален',
      project_created: 'Проект создан',
      project_updated: 'Проект обновлен',
      project_status_changed: 'Статус проекта изменен',
      user_login: 'Вход в систему',
      user_logout: 'Выход из системы',
      contract_fields_updated: 'Поля договора обновлены',
      qualification_object_created: 'Объект квалификации создан',
      qualification_object_updated: 'Объект квалификации обновлен',
      qualification_object_deleted: 'Объект квалификации удален',
      qualification_stage_completed: 'Этап квалификации завершен',
      qualification_stage_cancelled: 'Этап квалификации отменен',
      logger_data_uploaded: 'Данные логгеров загружены',
      logger_data_parsed: 'Данные логгеров обработаны',
      report_generated: 'Отчет сгенерирован',
      report_approved: 'Отчет согласован',
      report_rejected: 'Отчет отклонен',
      documentation_status_changed: 'Статус документации изменен'
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType: AuditEntityType): string => {
    const labels: Record<AuditEntityType, string> = {
      document: 'Документ',
      project: 'Проект',
      qualification_object: 'Объект квалификации',
      logger_data: 'Данные логгеров',
      report: 'Отчет',
      user: 'Пользователь',
      contract: 'Договор',
      system: 'Система',
      documentation_item: 'Элемент документации'
    };
    return labels[entityType] || entityType;
  };

  const getActionColor = (action: AuditAction): string => {
    if (action.includes('approved')) return 'text-green-600 bg-green-100';
    if (action.includes('rejected')) return 'text-red-600 bg-red-100';
    if (action.includes('cancelled')) return 'text-yellow-600 bg-yellow-100';
    if (action.includes('completed')) return 'text-green-600 bg-green-100';
    if (action.includes('created') || action.includes('uploaded')) return 'text-blue-600 bg-blue-100';
    if (action.includes('deleted')) return 'text-red-600 bg-red-100';
    if (action.includes('updated') || action.includes('changed')) return 'text-indigo-600 bg-indigo-100';
    return 'text-gray-600 bg-gray-100';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Время', 'Пользователь', 'Роль', 'Действие', 'Тип сущности', 'ID сущности', 'Название сущности', 'Детали'].join(','),
      ...logs.map(log => [
        log.timestamp.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        log.userName,
        log.userRole,
        getActionLabel(log.action),
        getEntityTypeLabel(log.entityType),
        log.entityId,
        log.entityName || '',
        JSON.stringify(log.details || {})
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Аудит</h1>
                <p className="text-gray-600">История действий пользователей в системе</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportLogs}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Экспорт CSV</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Назад
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Действие</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value as AuditAction | '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Фильтр по действию"
              >
                <option value="">Все действия</option>
                <option value="document_approved">Документ согласован</option>
                <option value="document_rejected">Документ отклонен</option>
                <option value="document_approval_cancelled">Согласование отменено</option>
                <option value="document_uploaded">Документ загружен</option>
                <option value="document_deleted">Документ удален</option>
                <option value="project_created">Проект создан</option>
                <option value="project_updated">Проект обновлен</option>
                <option value="project_status_changed">Статус проекта изменен</option>
                <option value="user_login">Вход в систему</option>
                <option value="user_logout">Выход из системы</option>
                <option value="contract_fields_updated">Поля договора обновлены</option>
                <option value="qualification_stage_completed">Этап квалификации завершен</option>
                <option value="qualification_stage_cancelled">Этап квалификации отменен</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип сущности</label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value as AuditEntityType | '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Фильтр по типу сущности"
              >
                <option value="">Все типы</option>
                <option value="document">Документ</option>
                <option value="project">Проект</option>
                <option value="qualification_object">Объект квалификации</option>
                <option value="logger_data">Данные логгеров</option>
                <option value="report">Отчет</option>
                <option value="user">Пользователь</option>
                <option value="contract">Договор</option>
                <option value="system">Система</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Дата начала фильтрации"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Дата окончания фильтрации"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Загрузка записей аудита...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadLogs}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Попробовать снова
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Записи аудита не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Время</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>Пользователь</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действие
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сущность
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Детали
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.timestamp.toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                          <div className="text-sm text-gray-500">{log.userRole}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{getEntityTypeLabel(log.entityType)}</div>
                          {log.entityName && (
                            <div className="text-sm text-gray-500">{log.entityName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-indigo-600 hover:text-indigo-800">
                              Показать детали
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        {logs.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{logs.length}</div>
                <div className="text-sm text-gray-500">Всего записей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.action.includes('approved')).length}
                </div>
                <div className="text-sm text-gray-500">Согласований</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.action.includes('rejected')).length}
                </div>
                <div className="text-sm text-gray-500">Отклонений</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(logs.map(log => log.userId)).size}
                </div>
                <div className="text-sm text-gray-500">Уникальных пользователей</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
