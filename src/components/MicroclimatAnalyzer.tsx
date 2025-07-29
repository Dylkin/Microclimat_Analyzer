import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun, Upload, Trash2, Clock, CheckCircle, XCircle, Loader, ChevronUp, ChevronDown, BarChart } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { databaseService } from '../utils/database';
import { Testo174HBinaryParser } from '../utils/testo174hBinaryParser';
import { Testo174TBinaryParser } from '../utils/testo174tBinaryParser';

export const MicroclimatAnalyzer: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = React.useState<{ fileId: string; field: 'zoneNumber' | 'measurementLevel' } | null>(null);

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
        parsingStatus: 'processing' as const,
        order: uploadedFiles.length + index
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
        // Реальный парсинг файла
        console.log(`Парсинг файла: ${file.name}`);
        
        // Читаем файл как ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        let parsedData;
        if (file.name.includes('DL-019') || file.name.includes('174T')) {
          // Одноканальный логгер (Testo 174T)
          const parser = new Testo174TBinaryParser(arrayBuffer);
          parsedData = parser.parse(file.name);
        } else {
          // Двухканальный логгер (Testo 174H) - по умолчанию
          const parser = new Testo174HBinaryParser(arrayBuffer);
          parsedData = parser.parse(file.name);
        }
        
        // Сохраняем в базу данных
        await databaseService.saveParsedFileData(parsedData, fileRecord.id);
        
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            const period = `${parsedData.startDate.toLocaleDateString('ru-RU')} - ${parsedData.endDate.toLocaleDateString('ru-RU')}`;
            return {
              ...f,
              parsingStatus: 'completed' as const, 
              parsedData,
              recordCount: parsedData.recordCount,
              period
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

  const moveFile = (fileId: string, direction: 'up' | 'down') => {
    setUploadedFiles(prev => {
      const sortedFiles = [...prev].sort((a, b) => a.order - b.order);
      const currentIndex = sortedFiles.findIndex(f => f.id === fileId);
      
      if (currentIndex === -1) return prev;
      if (direction === 'up' && currentIndex === 0) return prev;
      if (direction === 'down' && currentIndex === sortedFiles.length - 1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Меняем местами order
      const currentFile = sortedFiles[currentIndex];
      const targetFile = sortedFiles[newIndex];
      
      return prev.map(f => {
        if (f.id === currentFile.id) return { ...f, order: targetFile.order };
        if (f.id === targetFile.id) return { ...f, order: currentFile.order };
        return f;
      });
    });
  };

  const updateFileField = (fileId: string, field: 'zoneNumber' | 'measurementLevel', value: string | number) => {
    setUploadedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const handleExploreData = () => {
    const completedFiles = uploadedFiles.filter(f => f.parsingStatus === 'completed');
    if (completedFiles.length === 0) {
      alert('Нет обработанных файлов для исследования');
      return;
    }
    
    // Здесь будет логика отображения графиков
    console.log('Исследование данных для файлов:', completedFiles);
    alert(`Исследование данных для ${completedFiles.length} файлов (функция в разработке)`);
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
        return 'Загрузка';
      case 'processing':
        return 'Обработка';
      case 'completed':
        return 'Обработан';
      case 'error':
        return 'Ошибка обработки';
      default:
        return 'Неизвестно';
    }
  };

  // Сортируем файлы по порядку для отображения
  const sortedFiles = [...uploadedFiles].sort((a, b) => a.order - b.order);

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
          <div className="flex space-x-3">
            <button
              onClick={handleExploreData}
              disabled={uploadedFiles.filter(f => f.parsingStatus === 'completed').length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <BarChart className="w-4 h-4" />
              <span>Исследовать данные</span>
            </button>
            <button
              onClick={triggerFileUpload}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файлы в формате Vi2</span>
            </button>
          </div>
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
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
                    Уровень измерения (м.)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Удалить
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFiles.map((file, index) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveFile(file.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveFile(file.id, 'down')}
                          disabled={index === sortedFiles.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
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
                      {editingField?.fileId === file.id && editingField?.field === 'zoneNumber' ? (
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={file.zoneNumber || ''}
                          onChange={(e) => updateFileField(file.id, 'zoneNumber', parseInt(e.target.value) || '')}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField({ fileId: file.id, field: 'zoneNumber' })}
                          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          {file.zoneNumber || 'Нажмите для ввода'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingField?.fileId === file.id && editingField?.field === 'measurementLevel' ? (
                        <input
                          type="text"
                          value={file.measurementLevel || ''}
                          onChange={(e) => updateFileField(file.id, 'measurementLevel', e.target.value)}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField({ fileId: file.id, field: 'measurementLevel' })}
                          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          {file.measurementLevel || 'Нажмите для ввода'}
                        </div>
                      )}
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