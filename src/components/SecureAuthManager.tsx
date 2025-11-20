import React, { useState, useEffect } from 'react';
import { Database, User, Shield, CheckCircle, AlertTriangle, Key, LogIn } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const SecureAuthManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking');
  const [message, setMessage] = useState<string>('');
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    initializeSupabaseAuth();
  }, []);

  const initializeSupabaseAuth = async () => {
    setLoading(true);
    setAuthStatus('checking');
    
    try {
      // Используем единый Supabase клиент
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
        setUser(session.user);
        setMessage(`Пользователь аутентифицирован: ${session.user.email || 'Без email'}`);
        setAuthStatus('authenticated');
      } else {
        setMessage('Пользователь не аутентифицирован. Необходима аутентификация для доступа к Storage.');
        setAuthStatus('unauthenticated');
      }
      
    } catch (error: any) {
      console.error('Ошибка инициализации Supabase:', error);
      setMessage(`Ошибка: ${error.message}`);
      setAuthStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabaseClient) {
      setMessage('Supabase клиент не инициализирован');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setMessage(`Ошибка входа: ${error.message}`);
        setAuthStatus('error');
      } else {
        setUser(data.user);
        setMessage(`Успешный вход: ${data.user.email}`);
        setAuthStatus('authenticated');
      }
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}`);
      setAuthStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabaseClient) {
      setMessage('Supabase клиент не инициализирован');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setMessage(`Ошибка регистрации: ${error.message}`);
        setAuthStatus('error');
      } else {
        setMessage(`Регистрация успешна. Проверьте email для подтверждения: ${data.user?.email}`);
        setAuthStatus('unauthenticated');
      }
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}`);
      setAuthStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabaseClient) {
      setMessage('Supabase клиент не инициализирован');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        setMessage(`Ошибка выхода: ${error.message}`);
      } else {
        setUser(null);
        setMessage('Успешный выход из системы');
        setAuthStatus('unauthenticated');
      }
      
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSecureStorageUpload = async () => {
    if (!supabaseClient || !user) {
      setMessage('Необходима аутентификация для тестирования Storage');
      return;
    }
    
    setLoading(true);
    
    try {
      // Создаем тестовый файл
      const testFile = new File(['secure test content'], 'secure_test.txt', { type: 'application/octet-stream' });
      const filePath = `secure_test/${Date.now()}_secure_test.txt`;
      
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
        setMessage('✅ Безопасная загрузка успешна! Storage работает с аутентификацией.');
        
        // Удаляем тестовый файл
        await supabaseClient.storage.from('documents').remove([filePath]);
        setMessage('✅ Безопасная загрузка успешна! Тестовый файл удален.');
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
      case 'unauthenticated':
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
      case 'unauthenticated':
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
        <Shield className="w-8 h-8 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Secure Auth Manager</h2>
      </div>

      <div className="space-y-4">
        {/* Status Display */}
        <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {authStatus === 'checking' && 'Проверка аутентификации...'}
                {authStatus === 'authenticated' && 'Безопасная аутентификация активна'}
                {authStatus === 'unauthenticated' && 'Требуется аутентификация'}
                {authStatus === 'error' && 'Ошибка аутентификации'}
              </h3>
              {message && (
                <p className="text-sm text-gray-700 mt-1">{message}</p>
              )}
              {user && (
                <p className="text-sm text-gray-600 mt-1">
                  Пользователь: {user.email} (ID: {user.id})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Authentication Actions */}
        {authStatus === 'unauthenticated' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-3">Аутентификация</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const email = (document.getElementById('email') as HTMLInputElement)?.value;
                    const password = (document.getElementById('password') as HTMLInputElement)?.value;
                    if (email && password) signInWithEmail(email, password);
                  }}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </button>
                <button
                  onClick={() => {
                    const email = (document.getElementById('email') as HTMLInputElement)?.value;
                    const password = (document.getElementById('password') as HTMLInputElement)?.value;
                    if (email && password) signUpWithEmail(email, password);
                  }}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Регистрация</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authenticated Actions */}
        {authStatus === 'authenticated' && (
          <div className="flex space-x-4">
            <button
              onClick={testSecureStorageUpload}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Тест Secure Storage</span>
            </button>
            <button
              onClick={signOut}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Безопасная настройка:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Выполните <code className="bg-gray-100 px-1 rounded">secure_storage_no_rls_change.sql</code> в Supabase SQL Editor</li>
            <li>Зарегистрируйтесь или войдите в систему</li>
            <li>Протестируйте безопасную загрузку файлов</li>
            <li>Теперь загрузка документов будет работать с аутентификацией</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Примечание:</h4>
            <p className="text-sm text-blue-800">
              Если возникает ошибка "must be owner of table objects", используйте 
              <code className="bg-blue-100 px-1 rounded">secure_storage_no_rls_change.sql</code> 
              вместо <code className="bg-blue-100 px-1 rounded">secure_storage_setup.sql</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureAuthManager;
