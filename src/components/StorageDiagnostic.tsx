import React, { useState } from 'react';
import { Database, Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

const StorageDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testFile, setTestFile] = useState<File | null>(null);

  const addResult = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setResults(prev => [...prev, `[${timestamp}] ${icon} ${message}`]);
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('Начинаем диагностику Storage...');
      
      // Проверяем переменные окружения
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        addResult('❌ Переменные окружения не настроены', 'error');
        addResult(`VITE_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`, 'info');
        addResult(`VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✅' : '❌'}`, 'info');
        return;
      }
      
      addResult('✅ Переменные окружения настроены', 'success');
      
      // Создаем Supabase клиент
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      addResult('✅ Supabase клиент создан', 'success');
      
      // Проверяем аутентификацию
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        addResult(`❌ Ошибка аутентификации: ${authError.message}`, 'error');
      } else if (user) {
        addResult(`✅ Пользователь аутентифицирован: ${user.email}`, 'success');
      } else {
        addResult('⚠️ Пользователь не аутентифицирован', 'info');
      }
      
      // Проверяем доступ к Storage
      const { data: buckets, error: bucketsError } = await supabase
        .from('storage.buckets')
        .select('*')
        .eq('id', 'documents');
      
      if (bucketsError) {
        addResult(`❌ Ошибка доступа к buckets: ${bucketsError.message}`, 'error');
        
        // Пробуем через RPC
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('exec', {
              sql: `SELECT * FROM storage.buckets WHERE id = 'documents';`
            });
          
          if (rpcError) {
            addResult(`❌ RPC также не работает: ${rpcError.message}`, 'error');
          } else {
            addResult('✅ Bucket найден через RPC', 'success');
          }
        } catch (rpcErr) {
          addResult(`❌ RPC недоступен: ${rpcErr}`, 'error');
        }
      } else {
        if (buckets && buckets.length > 0) {
          const bucket = buckets[0];
          addResult(`✅ Bucket 'documents' найден`, 'success');
          addResult(`   - Public: ${bucket.public}`, 'info');
          addResult(`   - File size limit: ${bucket.file_size_limit}`, 'info');
        } else {
          addResult('❌ Bucket "documents" не найден', 'error');
        }
      }
      
      // Тестируем загрузку файла
      if (testFile) {
        addResult('🔄 Тестируем загрузку файла...');
        
        const filePath = `test/${Date.now()}_${testFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, testFile, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          addResult(`❌ Ошибка загрузки: ${uploadError.message}`, 'error');
          addResult(`   - Код: ${(uploadError as any).statusCode}`, 'info');
          addResult(`   - Детали: ${JSON.stringify(uploadError)}`, 'info');
        } else {
          addResult('✅ Файл успешно загружен!', 'success');
          addResult(`   - Путь: ${uploadData.path}`, 'info');
          
          // Удаляем тестовый файл
          await supabase.storage.from('documents').remove([filePath]);
          addResult('✅ Тестовый файл удален', 'success');
        }
      }
      
    } catch (error: any) {
      addResult(`❌ Критическая ошибка: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setTestFile(file || null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="w-8 h-8 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Storage Diagnostic</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Диагностика Storage</h3>
          <p className="text-sm text-blue-800">
            Этот инструмент поможет выявить проблемы с загрузкой файлов в Supabase Storage.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            title="Выберите файл для тестирования"
            aria-label="Выберите файл для тестирования"
          />
          <button
            onClick={testSupabaseConnection}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>{loading ? 'Диагностика...' : 'Запустить диагностику'}</span>
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Результаты диагностики:</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageDiagnostic;




