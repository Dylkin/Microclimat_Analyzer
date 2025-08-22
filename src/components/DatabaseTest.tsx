import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

interface TableInfo {
  name: string;
  accessible: boolean;
  error?: string;
  rowCount?: number;
}

export const DatabaseTest: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<{
    url: string;
    anonKey: string;
    connected: boolean;
  }>({
    url: '',
    anonKey: '',
    connected: false
  });

  // Список таблиц для проверки
  const tablesToCheck = [
    'users',
    'contractors',
    'contractor_contacts',
    'qualification_objects',
    'uploaded_files',
    'device_metadata',
    'measurement_records',
    'analysis_sessions',
    'chart_settings',
    'vertical_markers',
    'projects',
    'project_qualification_objects',
    'project_stage_assignments'
  ];

  useEffect(() => {
    // Проверяем конфигурацию Supabase
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    setSupabaseConfig({
      url,
      anonKey,
      connected: !!(url && anonKey)
    });
  }, []);

  const checkTables = async () => {
    if (!supabaseConfig.connected) {
      alert('Supabase не настроен. Проверьте переменные окружения.');
      return;
    }

    setLoading(true);
    const results: TableInfo[] = [];

    try {
      // Динамический импорт Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

      for (const tableName of tablesToCheck) {
        try {
          console.log(`Проверяем таблицу: ${tableName}`);
          
          // Пытаемся выполнить простой запрос к таблице
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.error(`Ошибка доступа к таблице ${tableName}:`, error);
            results.push({
              name: tableName,
              accessible: false,
              error: error.message
            });
          } else {
            console.log(`Таблица ${tableName} доступна, записей: ${count}`);
            results.push({
              name: tableName,
              accessible: true,
              rowCount: count || 0
            });
          }
        } catch (err) {
          console.error(`Исключение при проверке таблицы ${tableName}:`, err);
          results.push({
            name: tableName,
            accessible: false,
            error: err instanceof Error ? err.message : 'Неизвестная ошибка'
          });
        }
      }
    } catch (err) {
      console.error('Ошибка подключения к Supabase:', err);
      alert('Ошибка подключения к Supabase. Проверьте настройки.');
    }

    setTables(results);
    setLoading(false);
  };

  const getStatusIcon = (table: TableInfo) => {
    if (table.accessible) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const accessibleCount = tables.filter(t => t.accessible).length;
  const totalCount = tables.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Database className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Проверка базы данных</h1>
      </div>

      {/* Конфигурация Supabase */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Конфигурация Supabase</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <div className="flex items-center space-x-2">
              {supabaseConfig.url ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {supabaseConfig.url || 'Не настроен'}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anon Key</label>
            <div className="flex items-center space-x-2">
              {supabaseConfig.anonKey ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {supabaseConfig.anonKey ? 'Настроен' : 'Не настроен'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center space-x-2">
            {supabaseConfig.connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-medium ${
              supabaseConfig.connected ? 'text-green-700' : 'text-red-700'
            }`}>
              {supabaseConfig.connected ? 'Конфигурация корректна' : 'Конфигурация некорректна'}
            </span>
          </div>
        </div>
      </div>

      {/* Кнопка проверки */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Проверка таблиц</h2>
          <button
            onClick={checkTables}
            disabled={loading || !supabaseConfig.connected}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Проверка...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Проверить таблицы</span>
              </>
            )}
          </button>
        </div>

        {/* Результаты проверки */}
        {tables.length > 0 && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                {accessibleCount === totalCount ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : accessibleCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">
                  Доступно {accessibleCount} из {totalCount} таблиц
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Таблица
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Количество записей
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ошибка
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map((table) => (
                    <tr key={table.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusIcon(table)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {table.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {table.accessible ? (table.rowCount || 0).toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {table.error && (
                          <span className="text-sm text-red-600">
                            {table.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Инструкции */}
        {!supabaseConfig.connected && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Настройка Supabase
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Для подключения к базе данных необходимо:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Нажать кнопку "Connect to Supabase" в правом верхнем углу</li>
                    <li>Ввести URL и Anon Key вашего Supabase проекта</li>
                    <li>Убедиться, что все миграции применены</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};