import React, { useState } from 'react';
import { Database, Shield, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

const StorageRLSManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Функция для создания Supabase клиента
  const getSupabaseClient = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL и ключ должны быть настроены в переменных окружения');
    }
    
    return createClient(supabaseUrl, supabaseKey);
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const createStorageBucket = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      // Создаем bucket через RPC
      const { error } = await supabase.rpc('exec', {
        sql: `
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (
            'documents',
            'documents',
            false,
            52428800,
            ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          )
          ON CONFLICT (id) DO NOTHING;
        `
      });

      if (error) throw error;
      showMessage('success', 'Bucket "documents" создан успешно');
    } catch (error: any) {
      showMessage('error', `Ошибка создания bucket: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disableStorageRLS = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;'
      });

      if (error) throw error;
      showMessage('success', 'RLS для storage.objects отключен');
    } catch (error: any) {
      showMessage('error', `Ошибка отключения RLS: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createStoragePolicies = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const policies = [
        `CREATE POLICY "Allow authenticated users to view documents" ON storage.objects
         FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'documents');`,
        
        `CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
         FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'documents');`,
        
        `CREATE POLICY "Allow authenticated users to update documents" ON storage.objects
         FOR UPDATE USING (auth.role() = 'authenticated' AND bucket_id = 'documents');`,
        
        `CREATE POLICY "Allow authenticated users to delete documents" ON storage.objects
         FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'documents');`
      ];

      for (const policy of policies) {
        const { error } = await supabase.rpc('exec', { sql: policy });
        if (error) throw error;
      }

      showMessage('success', 'Политики Storage созданы успешно');
    } catch (error: any) {
      showMessage('error', `Ошибка создания политик: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const enableStorageRLS = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
      });

      if (error) throw error;
      showMessage('success', 'RLS для storage.objects включен');
    } catch (error: any) {
      showMessage('error', `Ошибка включения RLS: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkStorageStatus = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      // Пробуем проверить существование bucket через RPC
      try {
        const { data: buckets, error: bucketsError } = await supabase
          .rpc('exec', {
            sql: `SELECT * FROM storage.buckets WHERE id = 'documents';`
          });

        if (bucketsError) throw bucketsError;

        if (buckets && Array.isArray(buckets) && buckets.length > 0) {
          showMessage('success', 'Bucket "documents" существует');
        } else {
          showMessage('info', 'Bucket "documents" не найден');
        }
      } catch (rpcError) {
        // Если RPC не работает, показываем подробную инструкцию
        showMessage('info', 'RPC недоступен. Используйте SQL Editor в Supabase Dashboard. См. файл manual_storage_fix_guide.md для подробных инструкций.');
      }
    } catch (error: any) {
      showMessage('error', `Ошибка проверки Storage: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Storage RLS Manager</h2>
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
              <h3 className="text-sm font-medium text-yellow-800">Проблема с загрузкой документов</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Ошибка: "Недостаточно прав для загрузки в bucket 'documents'". 
                Если возникает ошибка "must be owner of table objects", используйте публичный bucket.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={checkStorageStatus}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Проверить Storage</span>
          </button>

          <button
            onClick={createStorageBucket}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Создать Bucket</span>
          </button>

          <button
            onClick={disableStorageRLS}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Отключить RLS</span>
          </button>

          <button
            onClick={createStoragePolicies}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Создать Политики</span>
          </button>

          <button
            onClick={enableStorageRLS}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>Включить RLS</span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Инструкции:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Нажмите "Проверить Storage" для проверки существования bucket</li>
            <li>Если bucket не существует, нажмите "Создать Bucket"</li>
            <li>Нажмите "Отключить RLS" для временного отключения</li>
            <li>Нажмите "Создать Политики" для настройки доступа</li>
            <li>Нажмите "Включить RLS" для включения обратно</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Рекомендуемый способ:</h4>
            <p className="text-sm text-blue-800 mb-2">
              Поскольку RPC может быть недоступен, используйте SQL Editor в Supabase Dashboard:
            </p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Откройте Supabase Dashboard → SQL Editor</li>
              <li><strong>Если ошибка "must be owner":</strong> используйте <code className="bg-blue-100 px-1 rounded">public_bucket_fix.sql</code></li>
              <li><strong>Если RLS работает:</strong> используйте <code className="bg-blue-100 px-1 rounded">alternative_storage_fix.sql</code></li>
              <li>Или следуйте инструкциям в <code className="bg-blue-100 px-1 rounded">manual_storage_fix_guide.md</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageRLSManager;
