import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DataFile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, BarChart3, AlertCircle, GripVertical } from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('data_files')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      setError('Ошибка загрузки файлов');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || !user) return;

    setUploading(true);
    setError('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Check file extension
        if (!file.name.toLowerCase().endsWith('.vi2')) {
          setError(`Файл ${file.name} имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
          continue;
        }

        // Upload file to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('data-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase
          .from('data_files')
          .insert({
            filename: fileName,
            original_filename: file.name,
            file_path: uploadData.path,
            status: 'uploading',
            user_id: user.id,
            order_index: files.length + i
          });

        if (dbError) throw dbError;
      }

      await fetchFiles();
      // Reset file input
      event.target.value = '';
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки файлов');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, filePath: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('data-files')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('data_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      await fetchFiles();
    } catch (err: any) {
      setError('Ошибка удаления файла');
    }
  };

  const updateFileField = async (fileId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('data_files')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;
      
      // Update local state
      setFiles(files.map(f => f.id === fileId ? { ...f, [field]: value } : f));
    } catch (err: any) {
      setError('Ошибка обновления файла');
    }
  };

  const getStatusLabel = (status: DataFile['status']) => {
    switch (status) {
      case 'uploading': return 'Загрузка';
      case 'processed': return 'Обработан';
      case 'error': return 'Ошибка обработки';
      case 'saved': return 'Сохранен';
      default: return status;
    }
  };

  const getStatusColor = (status: DataFile['status']) => {
    switch (status) {
      case 'uploading': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'saved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPeriod = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const startDate = new Date(start).toLocaleString('ru-RU');
    const endDate = new Date(end).toLocaleString('ru-RU');
    return `${startDate} - ${endDate}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка файлов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Загрузка файлов</h2>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Загрузка...' : 'Загрузить файлы'}</span>
                <input
                  type="file"
                  multiple
                  accept=".vi2"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {files.length > 0 && (
                <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span>Исследовать данные</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Порядок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Имя файла
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Период данных
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество записей
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № зоны измерения
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Уровень измерения
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file, index) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center">
                      <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {file.original_filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatPeriod(file.period_start, file.period_end)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {file.record_count || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={file.zone_number || ''}
                      onChange={(e) => updateFileField(file.id, 'zone_number', parseInt(e.target.value) || null)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1-99"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={file.measurement_level || ''}
                      onChange={(e) => updateFileField(file.id, 'measurement_level', e.target.value)}
                      className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Уровень"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(file.status)}`}>
                      {getStatusLabel(file.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(file.id, file.file_path)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {files.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Файлы не загружены</p>
            <p className="text-sm">Загрузите файлы формата .vi2 для начала работы</p>
          </div>
        )}
      </div>
    </div>
  );
}