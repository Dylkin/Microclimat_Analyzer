import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun, Upload, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { databaseService } from '../utils/database';
import { CSVExporter } from '../utils/csvExporter';

export const MicroclimatAnalyzer: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const mockData = [
    { label: 'Температура', value: '22.5°C', icon: Thermometer, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Влажность', value: '65%', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Скорость ветра', value: '3.2 м/с', icon: Wind, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Освещенность', value: '850 лк', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-100' }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Создаем записи для файлов с начальным статусом
    const newFiles: UploadedFile[] = fileArray.map(file => {
      // Проверяем расширение файла
      if (!file.name.toLowerCase().endsWith('.vi2')) {
        alert(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
        return null;
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        uploadDate: new Date().toLocaleString('ru-RU'),
        parsingStatus: 'processing' as const
      };
    }).filter(Boolean) as UploadedFile[];

    // Добавляем файлы в состояние
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Парсим файлы
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileRecord = newFiles[i];
      
      if (!fileRecord) continue;
      
      try {
        // Имитация обработки файла
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            return {
              ...f,
              parsingStatus: 'completed' as const,
              recordCount: Math.floor(Math.random() * 1000) + 100,
              period: '02.06.2025 - 17.06.2025'
            };
          }
          return f;
        }));
        
      } catch (error) {
        console.error('Ошибка парсинга файла:', error);
        
        // Обновляем статус на ошибку
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            return {
              ...f,
              parsingStatus: 'error' as const,
              errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
          }
          return f;
        }));
      }
    }

    // Очищаем input для возможности загрузки того же файла повторно
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
      try {
        // Удаляем данные из базы
        await databaseService.deleteFileData(fileId);
      } catch (error) {
        console.error('Ошибка удаления данных из базы:', error);
      }
      
      // Удаляем из состояния
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadCSV = (file: UploadedFile) => {
    if (file.csvDownloadUrl && file.csvFileName) {
      const link = document.createElement('a');
      link.href = file.csvDownloadUrl;
      link.download = file.csvFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusIcon = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return 'Ожидание';
      case 'processing':
        return 'Обработка';
      case 'completed':
        return 'Обработано';
      case 'error':
        return 'Ошибка';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Microclimat Analyzer</h1>
      </div>

      {/* Секция загрузки файлов */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Загрузка файлов</h2>
          <button
            onClick={triggerFileUpload}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Загрузить файлы в формате Vi2</span>
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".vi2"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {uploadedFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Имя файла
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Период данных
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Записей
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSV экспорт
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Удалить
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.uploadDate}</div>
                        {file.parsedData && (
                          <div className="text-xs text-gray-500 mt-1">
                            {file.parsedData.deviceMetadata.deviceModel} (S/N: {file.parsedData.deviceMetadata.serialNumber})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.parsingStatus)}
                        <span className="text-sm text-gray-900">{getStatusText(file.parsingStatus)}</span>
                      </div>
                      {file.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">{file.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.period || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.recordCount ? file.recordCount.toLocaleString('ru-RU') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {file.csvDownloadUrl ? (
                        <button
                          onClick={() => handleDownloadCSV(file)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                          title="Скачать CSV файл"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          CSV
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Удалить файл"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Файлы не загружены</p>
            <p className="text-sm">Нажмите кнопку "Загрузить файлы" для добавления файлов в формате .vi2</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Анализ микроклимата</h2>
        <p className="text-gray-600 mb-6">
          Система анализа микроклимата предназначена для мониторинга и анализа климатических параметров 
          в помещениях и на открытых территориях.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <h3 className="font-medium text-gray-900">{item.label}</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">График температуры</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">График температуры за последние 24 часа</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">График влажности</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">График влажности за последние 24 часа</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Рекомендации</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-green-900">Температура в норме</p>
              <p className="text-sm text-green-700">Текущая температура находится в оптимальном диапазоне для комфортного пребывания.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-yellow-900">Повышенная влажность</p>
              <p className="text-sm text-yellow-700">Рекомендуется включить вентиляцию для снижения уровня влажности.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};