import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, Loader } from 'lucide-react';

interface ConnectionTestResult {
  status: 'testing' | 'success' | 'error';
  message: string;
  details?: any;
}

const SupabaseConnectionTest: React.FC = () => {
  const [testResult, setTestResult] = useState<ConnectionTestResult>({
    status: 'testing',
    message: 'Проверка подключения к Supabase...'
  });

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      setTestResult({
        status: 'testing',
        message: 'Проверка подключения к Supabase...'
      });

      // Проверяем переменные окружения
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url_here') {
        throw new Error('Переменные окружения Supabase не настроены');
      }

      // Динамически импортируем Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Тестируем подключение
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Ошибка подключения: ${error.message}`);
      }

      setTestResult({
        status: 'success',
        message: 'Подключение к Supabase успешно!',
        details: {
          url: supabaseUrl,
          keyLength: supabaseKey.length,
          tablesAccessible: true
        }
      });

    } catch (error: any) {
      setTestResult({
        status: 'error',
        message: `Ошибка подключения: ${error.message}`,
        details: {
          error: error.message,
          url: import.meta.env.VITE_SUPABASE_URL,
          hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
    }
  };

  const getStatusIcon = () => {
    switch (testResult.status) {
      case 'testing':
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (testResult.status) {
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          Тест подключения к Supabase
        </h1>
      </div>

      <div className={`border-2 rounded-lg p-6 ${getStatusColor()}`}>
        <div className="flex items-center gap-3 mb-4">
          {getStatusIcon()}
          <h2 className="text-lg font-semibold">
            {testResult.message}
          </h2>
        </div>

        {testResult.details && (
          <div className="mt-4 p-4 bg-white rounded border">
            <h3 className="font-semibold mb-2">Детали подключения:</h3>
            <div className="space-y-2 text-sm">
              {testResult.details.url && (
                <div>
                  <span className="font-medium">URL:</span> {testResult.details.url}
                </div>
              )}
              {testResult.details.keyLength && (
                <div>
                  <span className="font-medium">Длина ключа:</span> {testResult.details.keyLength} символов
                </div>
              )}
              {testResult.details.tablesAccessible && (
                <div>
                  <span className="font-medium">Доступ к таблицам:</span> ✓ Доступен
                </div>
              )}
              {testResult.details.error && (
                <div className="text-red-600">
                  <span className="font-medium">Ошибка:</span> {testResult.details.error}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={testSupabaseConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Повторить тест
          </button>
        </div>
      </div>

      {testResult.status === 'error' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Как исправить проблему:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Убедитесь, что файл .env существует в корне проекта</li>
            <li>Проверьте, что VITE_SUPABASE_URL содержит правильный URL вашего проекта</li>
            <li>Проверьте, что VITE_SUPABASE_ANON_KEY содержит правильный ключ API</li>
            <li>Перезапустите сервер разработки после изменения .env файла</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default SupabaseConnectionTest;