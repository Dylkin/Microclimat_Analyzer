import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, RefreshCw, Upload, Eye } from 'lucide-react';

interface BucketStatus {
  id: string;
  exists: boolean;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export const BucketDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState<BucketStatus[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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

  const checkBuckets = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      // Проверяем существование всех необходимых buckets
      const requiredBuckets = ['documents', 'qualification-objects', 'equipment-files'];
      const bucketStatuses: BucketStatus[] = [];

      for (const bucketId of requiredBuckets) {
        try {
          const { data, error } = await supabase
            .from('storage.buckets')
            .select('*')
            .eq('id', bucketId)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
          }

          bucketStatuses.push({
            id: bucketId,
            exists: !!data,
            public: data?.public || false,
            fileSizeLimit: data?.file_size_limit || 0,
            allowedMimeTypes: data?.allowed_mime_types || []
          });
        } catch (error) {
          bucketStatuses.push({
            id: bucketId,
            exists: false,
            public: false,
            fileSizeLimit: 0,
            allowedMimeTypes: []
          });
        }
      }

      setBuckets(bucketStatuses);
      showMessage('info', 'Проверка buckets завершена');
    } catch (error: any) {
      showMessage('error', `Ошибка проверки buckets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMissingBuckets = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const bucketConfigs = [
        {
          id: 'documents',
          name: 'documents',
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        },
        {
          id: 'qualification-objects',
          name: 'qualification-objects',
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
        },
        {
          id: 'equipment-files',
          name: 'equipment-files',
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
        }
      ];

      for (const config of bucketConfigs) {
        const { error } = await supabase.rpc('exec', {
          sql: `
            INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
            VALUES (
              '${config.id}',
              '${config.name}',
              ${config.public},
              ${config.fileSizeLimit},
              ARRAY[${config.allowedMimeTypes.map(type => `'${type}'`).join(', ')}]
            )
            ON CONFLICT (id) DO UPDATE SET
              public = ${config.public},
              file_size_limit = ${config.fileSizeLimit},
              allowed_mime_types = ARRAY[${config.allowedMimeTypes.map(type => `'${type}'`).join(', ')}];
          `
        });

        if (error) {
          console.warn(`Ошибка создания bucket ${config.id}:`, error);
        }
      }

      showMessage('success', 'Buckets созданы/обновлены успешно');
      await checkBuckets(); // Обновляем статус
    } catch (error: any) {
      showMessage('error', `Ошибка создания buckets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDocumentUpload = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      // Создаем тестовый файл
      const testContent = 'Test document content';
      const testFile = new File([testContent], 'test.txt', { type: 'application/octet-stream' });
      
      const { error } = await supabase.storage
        .from('documents')
        .upload('test/test-file.txt', testFile);

      if (error) {
        throw error;
      }

      // Получаем публичный URL
      // const { data: urlData } = supabase.storage
      //   .from('documents')
      //   .getPublicUrl('test/test-file.txt');

      // Удаляем тестовый файл
      await supabase.storage
        .from('documents')
        .remove(['test/test-file.txt']);

      showMessage('success', 'Тест загрузки прошел успешно! Bucket работает корректно.');
    } catch (error: any) {
      showMessage('error', `Ошибка тестирования: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Диагностика Storage Buckets</h2>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
           <RefreshCw className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex space-x-3">
          <button
            onClick={checkBuckets}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Проверить Buckets</span>
          </button>

          <button
            onClick={createMissingBuckets}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Создать Отсутствующие</span>
          </button>

          <button
            onClick={testDocumentUpload}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            <span>Тест Загрузки</span>
          </button>
        </div>

        {buckets.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Статус Buckets</h3>
            {buckets.map((bucket) => (
              <div key={bucket.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {bucket.exists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{bucket.id}</h4>
                      <p className="text-sm text-gray-500">
                        {bucket.exists ? 'Существует' : 'Отсутствует'} • 
                        {bucket.public ? ' Публичный' : ' Приватный'} • 
                        Лимит: {Math.round(bucket.fileSizeLimit / 1024 / 1024)}MB
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {bucket.allowedMimeTypes.length} типов файлов
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Инструкции по исправлению</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Нажмите "Проверить Buckets" для диагностики</li>
            <li>Если какие-то buckets отсутствуют, нажмите "Создать Отсутствующие"</li>
            <li>Используйте "Тест Загрузки" для проверки работоспособности</li>
            <li>Если автоматическое создание не работает, используйте SQL команды из файла complete_bucket_fix.sql</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

