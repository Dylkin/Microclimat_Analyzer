import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';

interface RLSStatus {
  table: string;
  enabled: boolean;
  error?: string;
}

const RLSManager: React.FC = () => {
  const [rlsStatus, setRlsStatus] = useState<RLSStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const tables = [
    'projects',
    'project_qualification_objects', 
    'qualification_objects',
    'contractors',
    'users',
    'equipment',
    'qualification_object_testing_periods',
    'testing_period_documents'
  ];

  const checkRLSStatus = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase не настроен');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const statuses: RLSStatus[] = [];
      
      for (const table of tables) {
        try {
          // Пытаемся выполнить простой запрос для проверки доступа
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
          if (error) {
            statuses.push({
              table,
              enabled: true,
              error: error.message
            });
          } else {
            statuses.push({
              table,
              enabled: false
            });
          }
        } catch (err: any) {
          statuses.push({
            table,
            enabled: true,
            error: err.message
          });
        }
      }
      
      setRlsStatus(statuses);
      setMessage('Проверка завершена');
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createMissingTables = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase не настроен');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Создаем таблицу equipment
      const createEquipmentTable = `
        CREATE TABLE IF NOT EXISTS equipment (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          model VARCHAR(255),
          serial_number VARCHAR(255),
          manufacturer VARCHAR(255),
          type VARCHAR(100),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Пытаемся выполнить через rpc (может не работать)
      try {
        const { error } = await supabase.rpc('exec', { sql: createEquipmentTable });
        if (error) {
          throw new Error(`RPC не доступен: ${error.message}`);
        }
        setMessage('Таблица equipment создана успешно!');
      } catch (rpcError: any) {
        setMessage('Автоматическое создание таблиц недоступно. Выполните SQL команды вручную в Supabase Dashboard.');
      }
      
      checkRLSStatus();
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}. Используйте SQL Editor в Supabase Dashboard для ручного исправления.`);
    } finally {
      setIsLoading(false);
    }
  };

  const disableRLS = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase не настроен');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Пытаемся выполнить SQL команды через rpc
      let successCount = 0;
      let errorCount = 0;
      
      for (const table of tables) {
        try {
          // Пытаемся выполнить SQL команду для отключения RLS
          const { error } = await supabase.rpc('exec', {
            sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
          });
          
          if (error) {
            console.warn(`Не удалось отключить RLS для ${table}:`, error.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.warn(`Ошибка для ${table}:`, err.message);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setMessage(`RLS отключен для ${successCount} таблиц. ${errorCount > 0 ? `${errorCount} таблиц требуют ручного исправления.` : ''}`);
      } else {
        setMessage('Автоматическое отключение RLS недоступно. Используйте SQL Editor в Supabase Dashboard.');
      }
      
      checkRLSStatus();
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}. Используйте SQL Editor в Supabase Dashboard для ручного исправления.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: RLSStatus) => {
    if (status.error) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (status.enabled) {
      return <Shield className="w-5 h-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = (status: RLSStatus) => {
    if (status.error) {
      return 'Ошибка доступа';
    } else if (status.enabled) {
      return 'RLS включен';
    } else {
      return 'RLS отключен';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          Управление Row Level Security
        </h1>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-2">
              КРИТИЧЕСКАЯ ПРОБЛЕМА: RLS все еще активен!
            </h3>
            <p className="text-red-700 text-sm mb-2">
              Ошибка "new row violates row-level security policy for table projects" означает, 
              что RLS все еще включен для таблицы projects, несмотря на попытки отключения.
            </p>
            <p className="text-red-700 text-sm font-semibold">
              НЕМЕДЛЕННОЕ ДЕЙСТВИЕ: Выполните SQL команды из файла emergency_rls_fix.sql в Supabase Dashboard!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={checkRLSStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Проверка...' : 'Проверить статус RLS'}
          </button>
          
          <button
            onClick={createMissingTables}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Создание...' : 'Создать недостающие таблицы'}
          </button>
          
          <button
            onClick={disableRLS}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Отключение...' : 'Отключить RLS (для разработки)'}
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded ${
            message.includes('Ошибка') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {rlsStatus.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Статус таблиц</h2>
          <div className="space-y-3">
            {rlsStatus.map((status) => (
              <div key={status.table} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <span className="font-medium">{status.table}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {getStatusText(status)}
                  </div>
                  {status.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {status.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">
          Альтернативное решение
        </h3>
        <p className="text-blue-700 text-sm mb-3">
          Если автоматическое отключение RLS не работает, выполните SQL команды вручную:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
          <li>Откройте Supabase Dashboard → SQL Editor</li>
          <li>Скопируйте содержимое файла <code className="bg-blue-100 px-1 rounded">fix_rls_policies.sql</code></li>
          <li>Выполните SQL команды</li>
          <li>Попробуйте создать проект снова</li>
        </ol>
      </div>
    </div>
  );
};

export default RLSManager;
