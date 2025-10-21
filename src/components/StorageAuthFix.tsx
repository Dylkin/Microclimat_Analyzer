import React, { useState } from 'react';
import { Database, User, Key, AlertTriangle, CheckCircle } from 'lucide-react';

const StorageAuthFix: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const testAnonymousAuth = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Переменные окружения не настроены');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Проверяем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        showMessage('error', `Ошибка получения пользователя: ${userError.message}`);
        return;
      }
      
      if (!user) {
        showMessage('info', 'Пользователь не аутентифицирован. Пробуем анонимную аутентификацию...');
        
        // Пробуем анонимную аутентификацию
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          showMessage('error', `Ошибка анонимной аутентификации: ${authError.message}`);
          return;
        }
        
        showMessage('success', 'Анонимная аутентификация успешна');
      } else {
        showMessage('success', `Пользователь аутентифицирован: ${user.email || 'Анонимный'}`);
      }
      
      // Тестируем загрузку файла
      const testFile = new File(['test content'], 'test.txt', { type: 'application/octet-stream' });
      const filePath = `test/${Date.now()}_test.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, testFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        showMessage('error', `Ошибка загрузки: ${uploadError.message}`);
        showMessage('info', `Код ошибки: ${(uploadError as any).statusCode}`);
        showMessage('info', `Детали: ${JSON.stringify(uploadError, null, 2)}`);
      } else {
        showMessage('success', 'Тестовая загрузка успешна!');
        
        // Удаляем тестовый файл
        await supabase.storage.from('documents').remove([filePath]);
        showMessage('info', 'Тестовый файл удален');
      }
      
    } catch (error: any) {
      showMessage('error', `Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkEnvironmentVariables = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    showMessage('info', `VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Настроен' : '❌ Не настроен'}`);
    showMessage('info', `VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Настроен' : '❌ Не настроен'}`);
    
    if (supabaseUrl && supabaseKey) {
      showMessage('success', 'Переменные окружения настроены правильно');
    } else {
      showMessage('error', 'Переменные окружения не настроены');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Key className="w-8 h-8 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Storage Auth Fix</h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : message.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          ) : (
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
          )}
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Проблема с аутентификацией</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Ошибка загрузки может быть связана с отсутствием аутентификации пользователя.
                Попробуйте анонимную аутентификацию.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={checkEnvironmentVariables}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Проверить переменные</span>
          </button>

          <button
            onClick={testAnonymousAuth}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Тест аутентификации</span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Инструкции:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Нажмите "Проверить переменные" для проверки конфигурации</li>
            <li>Нажмите "Тест аутентификации" для проверки доступа к Storage</li>
            <li>Если тест успешен, попробуйте загрузить документ в приложении</li>
            <li>Если ошибка остается, используйте "Storage Diagnostic" для детальной диагностики</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default StorageAuthFix;


