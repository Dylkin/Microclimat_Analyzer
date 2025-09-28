import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    url: string;
    anonKey: string;
    connected: boolean;
    error: string | null;
    testing: boolean;
  }>({
    url: '',
    anonKey: '',
    connected: false,
    error: null,
    testing: false
  });

  const [testResults, setTestResults] = useState<{
    basicConnection: boolean | null;
    authTest: boolean | null;
    tableAccess: boolean | null;
    storageAccess: boolean | null;
    error: string | null;
  }>({
    basicConnection: null,
    authTest: null,
    tableAccess: null,
    storageAccess: null,
    error: null
  });

  useEffect(() => {
    // Проверяем переменные окружения
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    console.log('Supabase URL:', url);
    console.log('Supabase Anon Key:', anonKey ? `${anonKey.substring(0, 20)}...` : 'Не установлен');
    
    setConnectionStatus({
      url,
      anonKey,
      connected: !!(url && anonKey),
      error: null,
      testing: false
    });
  }, []);

  const testConnection = async () => {
    if (!connectionStatus.url || !connectionStatus.anonKey) {
      setTestResults(prev => ({
        ...prev,
        error: 'URL или Anon Key не настроены'
      }));
      return;
    }

    setConnectionStatus(prev => ({ ...prev, testing: true }));
    setTestResults({
      basicConnection: null,
      authTest: null,
      tableAccess: null,
      storageAccess: null,
      error: null
    });

    try {
      // Динамический импорт Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(connectionStatus.url, connectionStatus.anonKey);

      // Тест 1: Базовое подключение
      console.log('Тест 1: Базовое подключение...');
      try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
          console.error('Ошибка базового подключения:', error);
          setTestResults(prev => ({ 
            ...prev, 
            basicConnection: false,
            error: `Базовое подключение: ${error.message}`
          }));
          return;
        }
        setTestResults(prev => ({ ...prev, basicConnection: true }));
        console.log('✅ Базовое подключение успешно');
      } catch (err) {
        console.error('Исключение при базовом подключении:', err);
        setTestResults(prev => ({ 
          ...prev, 
          basicConnection: false,
          error: `Исключение подключения: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
        }));
        return;
      }

      // Тест 2: Доступ к таблицам
      console.log('Тест 2: Доступ к таблицам...');
      try {
        const { data: contractorsData, error: contractorsError } = await supabase
          .from('contractors')
          .select('*', { count: 'exact', head: true });

        if (contractorsError) {
          console.error('Ошибка доступа к таблице contractors:', contractorsError);
          setTestResults(prev => ({ 
            ...prev, 
            tableAccess: false,
            error: `Доступ к таблицам: ${contractorsError.message}`
          }));
        } else {
          setTestResults(prev => ({ ...prev, tableAccess: true }));
          console.log('✅ Доступ к таблицам успешен');
        }
      } catch (err) {
        console.error('Исключение при доступе к таблицам:', err);
        setTestResults(prev => ({ 
          ...prev, 
          tableAccess: false,
          error: `Исключение доступа к таблицам: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
        }));
      }

      // Тест 3: Доступ к Storage
      console.log('Тест 3: Доступ к Storage...');
      try {
        const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Ошибка доступа к Storage:', bucketsError);
          setTestResults(prev => ({ 
            ...prev, 
            storageAccess: false,
            error: prev.error || `Storage: ${bucketsError.message}`
          }));
        } else {
          setTestResults(prev => ({ ...prev, storageAccess: true }));
          console.log('✅ Доступ к Storage успешен');
          console.log('Доступные buckets:', bucketsData?.map(b => b.name));
        }
      } catch (err) {
        console.error('Исключение при доступе к Storage:', err);
        setTestResults(prev => ({ 
          ...prev, 
          storageAccess: false,
          error: prev.error || `Исключение Storage: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
        }));
      }

    } catch (importError) {
      console.error('Ошибка импорта Supabase:', importError);
      setTestResults({
        basicConnection: false,
        authTest: false,
        tableAccess: false,
        storageAccess: false,
        error: `Ошибка импорта Supabase: ${importError instanceof Error ? importError.message : 'Неизвестная ошибка'}`
      });
    } finally {
      setConnectionStatus(prev => ({ ...prev, testing: false }));
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse" />;
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Database className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Диагностика Supabase</h1>
      </div>

      {/* Конфигурация */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Конфигурация</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VITE_SUPABASE_URL</label>
            <div className="flex items-center space-x-2">
              {connectionStatus.url ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600 font-mono">
                {connectionStatus.url || 'Не установлен'}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VITE_SUPABASE_ANON_KEY</label>
            <div className="flex items-center space-x-2">
              {connectionStatus.anonKey ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600 font-mono">
                {connectionStatus.anonKey ? `${connectionStatus.anonKey.substring(0, 20)}...` : 'Не установлен'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {connectionStatus.connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-medium ${
              connectionStatus.connected ? 'text-green-700' : 'text-red-700'
            }`}>
              {connectionStatus.connected ? 'Конфигурация корректна' : 'Конфигурация некорректна'}
            </span>
          </div>

          <button
            onClick={testConnection}
            disabled={connectionStatus.testing || !connectionStatus.connected}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {connectionStatus.testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Тестирование...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Тестировать подключение</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Результаты тестирования */}
      {(testResults.basicConnection !== null || testResults.error) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Результаты тестирования</h2>
          
          {testResults.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Ошибка подключения</h3>
                  <p className="text-sm text-red-700 mt-1">{testResults.error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Базовое подключение</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(testResults.basicConnection)}
                <span className="text-sm text-gray-600">
                  {testResults.basicConnection === null ? 'Ожидание' : 
                   testResults.basicConnection ? 'Успешно' : 'Ошибка'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Доступ к таблицам</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(testResults.tableAccess)}
                <span className="text-sm text-gray-600">
                  {testResults.tableAccess === null ? 'Ожидание' : 
                   testResults.tableAccess ? 'Успешно' : 'Ошибка'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">Доступ к Storage</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(testResults.storageAccess)}
                <span className="text-sm text-gray-600">
                  {testResults.storageAccess === null ? 'Ожидание' : 
                   testResults.storageAccess ? 'Успешно' : 'Ошибка'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Инструкции по настройке */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
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
                <li>Ввести URL вашего Supabase проекта (например: https://your-project.supabase.co)</li>
                <li>Ввести Anon Key из настроек API вашего проекта</li>
                <li>Убедиться, что все миграции применены в вашем проекте</li>
                <li>Проверить, что RLS политики настроены корректно</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Отладочная информация */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-800 mb-3">Отладочная информация</h3>
        <div className="text-xs text-gray-600 space-y-1 font-mono">
          <div>NODE_ENV: {import.meta.env.NODE_ENV || 'не установлен'}</div>
          <div>MODE: {import.meta.env.MODE || 'не установлен'}</div>
          <div>BASE_URL: {import.meta.env.BASE_URL || 'не установлен'}</div>
          <div>PROD: {import.meta.env.PROD ? 'true' : 'false'}</div>
          <div>DEV: {import.meta.env.DEV ? 'true' : 'false'}</div>
        </div>
      </div>
    </div>
  );
};