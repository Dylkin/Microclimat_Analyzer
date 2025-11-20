import React, { useState, useEffect } from 'react';
import { Database, User, CheckCircle, AlertTriangle, Key } from 'lucide-react';

const SupabaseAuthInit: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'anonymous' | 'error'>('checking');
  const [message, setMessage] = useState<string>('');
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    initializeSupabaseAuth();
  }, []);

  const initializeSupabaseAuth = async () => {
    setLoading(true);
    setAuthStatus('checking');
    
    try {
      // Создаем Supabase клиент
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Переменные окружения не настроены');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      setSupabaseClient(supabase);
      
      // Проверяем текущую сессию
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Ошибка получения сессии:', sessionError);
        setMessage(`Ошибка сессии: ${sessionError.message}`);
        setAuthStatus('error');
        return;
      }
      
      if (session && session.user) {
        setMessage(`Пользователь аутентифицирован: ${session.user.email || 'Анонимный'}`);
        setAuthStatus('authenticated');
      } else {
        // Пробуем анонимную аутентификацию
        setMessage('Сессия отсутствует. Пробуем анонимную аутентификацию...');
        
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          console.error('Ошибка анонимной аутентификации:', authError);
          if (authError.message?.includes('Anonymous sign-ins are disabled')) {
            setMessage('Анонимная аутентификация отключена. Используйте SQL скрипт enable_anonymous_auth.sql или создайте публичную политику для Storage.');
            setAuthStatus('error');
          } else {
            setMessage(`Ошибка анонимной аутентификации: ${authError.message}`);
            setAuthStatus('error');
          }
        } else {
          setMessage('Анонимная аутентификация успешна');
          setAuthStatus('anonymous');
        }
      }
      
    } catch (error: any) {
      console.error('Ошибка инициализации Supabase:', error);
      setMessage(`Ошибка: ${error.message}`);
      setAuthStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testStorageUpload = async () => {
    if (!supabaseClient) {
      setMessage('Supabase клиент не инициализирован');
      return;
    }
    
    setLoading(true);
    
    try {
      // Создаем тестовый файл
      const testFile = new File(['test content for storage'], 'test.txt', { type: 'application/octet-stream' });
      const filePath = `test/${Date.now()}_test.txt`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('documents')
        .upload(filePath, testFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        setMessage(`Ошибка загрузки: ${uploadError.message}`);
        console.error('Детали ошибки загрузки:', uploadError);
      } else {
        setMessage('✅ Тестовая загрузка успешна! Storage работает корректно.');
        
        // Удаляем тестовый файл
        await supabaseClient.storage.from('documents').remove([filePath]);
        setMessage('✅ Тестовая загрузка успешна! Тестовый файл удален.');
      }
      
    } catch (error: any) {
      setMessage(`Ошибка тестирования: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (authStatus) {
      case 'checking':
        return <Database className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'authenticated':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'anonymous':
        return <User className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Database className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (authStatus) {
      case 'checking':
        return 'bg-blue-50 border-blue-200';
      case 'authenticated':
        return 'bg-green-50 border-green-200';
      case 'anonymous':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Key className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Supabase Auth Initialization</h2>
      </div>

      <div className="space-y-4">
        {/* Status Display */}
        <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {authStatus === 'checking' && 'Проверка аутентификации...'}
                {authStatus === 'authenticated' && 'Аутентификация успешна'}
                {authStatus === 'anonymous' && 'Анонимная аутентификация'}
                {authStatus === 'error' && 'Ошибка аутентификации'}
              </h3>
              {message && (
                <p className="text-sm text-gray-700 mt-1">{message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={initializeSupabaseAuth}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Переинициализировать</span>
          </button>

          {(authStatus === 'authenticated' || authStatus === 'anonymous') && (
            <button
              onClick={testStorageUpload}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Тест Storage</span>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Инструкции:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Дождитесь завершения инициализации аутентификации</li>
            <li>Если аутентификация успешна, нажмите "Тест Storage"</li>
            <li>Если тест Storage успешен, загрузка документов должна работать</li>
            <li>Если ошибки остаются, используйте другие диагностические инструменты</li>
          </ol>
          
          {authStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="text-sm font-medium text-red-900 mb-1">Решение проблемы:</h4>
              <ol className="text-sm text-red-800 space-y-1 list-decimal list-inside">
                <li>Выполните <code className="bg-red-100 px-1 rounded">enable_anonymous_auth.sql</code> в Supabase SQL Editor</li>
                <li>Или используйте <code className="bg-red-100 px-1 rounded">public_bucket_fix.sql</code> для создания публичной политики</li>
                <li>Или перейдите в "Storage RLS Manager" для настройки политик</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuthInit;
