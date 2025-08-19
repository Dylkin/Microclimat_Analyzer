import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun, Upload, Trash2, Clock, CheckCircle, XCircle, Loader, ChevronUp, ChevronDown, BarChart } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { supabaseDatabaseService } from '../utils/supabaseDatabase';
import { VI2ParsingService } from '../utils/vi2Parser';
import { DataVisualization } from './DataVisualization';

interface MicroclimatAnalyzerProps {
  showVisualization?: boolean;
  onShowVisualization?: (show: boolean) => void;
}

export const MicroclimatAnalyzer: React.FC<MicroclimatAnalyzerProps> = ({ 
  showVisualization = false, 
  onShowVisualization 
}) => {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = React.useState<{ fileId: string; field: 'zoneNumber' | 'measurementLevel' } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Загружаем файлы пользователя при монтировании компонента
  React.useEffect(() => {
    console.log('Загружаем файлы пользователя при монтировании компонента');
    loadUserFiles();
  }, []);

  const loadUserFiles = async () => {
    try {
      setIsLoading(true);
      console.log('Запрос файлов пользователя из базы данных...');
      const files = await supabaseDatabaseService.getUserFiles();
      console.log(`Загружено ${files.length} файлов из базы данных`);
      setUploadedFiles(files);
    } catch (error) {
      console.error('Ошибка загрузки файлов пользователя:', error);
      // Показываем пользователю ошибку
      alert('Ошибка загрузки файлов: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };
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
    
    // Обрабатываем каждый файл
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Проверяем расширение файла
      if (!file.name.toLowerCase().endsWith('.vi2')) {
        alert(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
        continue;
      }

      try {
        // Сохраняем файл в базу данных
        console.log(`Сохраняем файл в базу данных: ${file.name}`);
        const fileId = await supabaseDatabaseService.saveUploadedFile({
          name: file.name,
          uploadDate: new Date().toLocaleString('ru-RU'),
          parsingStatus: 'processing',
          order: uploadedFiles.length + i,
          userId: 'current-user' // Будет заменено в сервисе на реального пользователя
        });
        console.log(`Файл сохранен с ID: ${fileId}`);

        // Обновляем состояние с новым файлом
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          uploadDate: new Date().toLocaleString('ru-RU'),
          parsingStatus: 'processing',
          order: uploadedFiles.length + i
        };
        
        setUploadedFiles(prev => [...prev, newFile]);

        // Реальный парсинг файла
        console.log(`Парсинг файла: ${file.name}`);
        
        // Используем универсальный парсер VI2
        const parsingService = new VI2ParsingService();
        const parsedData = await parsingService.parseFile(file);
        console.log(`Парсинг завершен для файла: ${file.name}, записей: ${parsedData.recordCount}`);
        
        // Сохраняем в базу данных
        console.log(`Сохраняем данные парсинга в базу данных для файла: ${file.name}`);
        await supabaseDatabaseService.saveParsedFileData(fileId, parsedData);
        console.log(`Данные успешно сохранены в базу данных для файла: ${file.name}`);
        
        // Обновляем состояние с результатами парсинга
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileId) {
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
        
        // Обновляем статус на ошибку в базе данных
        try {
          console.log('Обновляем статус файла на ошибку в базе данных');
          // Перезагружаем файлы для обновления состояния
          await loadUserFiles();
        } catch (updateError) {
          console.error('Ошибка обновления статуса файла:', updateError);
        }
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
        console.log(`Удаляем файл из базы данных: ${fileId}`);
        // Удаляем файл из базы данных
        await supabaseDatabaseService.deleteFile(fileId);
        console.log(`Файл успешно удален из базы данных: ${fileId}`);
        
        // Обновляем состояние
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      } catch (error) {
        console.error('Ошибка удаления файла:', error);
        alert('Ошибка при удалении файла: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const moveFile = async (fileId: string, direction: 'up' | 'down') => {
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
      
      // Обновляем порядок в базе данных
      try {
        await supabaseDatabaseService.updateFileOrder(currentFile.id, targetFile.order);
        await supabaseDatabaseService.updateFileOrder(targetFile.id, currentFile.order);
        console.log(`Обновлен порядок файлов: ${currentFile.id} <-> ${targetFile.id}`);
      } catch (error) {
        console.error('Ошибка обновления порядка файлов:', error);
      }
      
      return prev.map(f => {
        if (f.id === currentFile.id) return { ...f, order: targetFile.order };
        if (f.id === targetFile.id) return { ...f, order: currentFile.order };
        return f;
      });
    });
  };

  const updateFileField = async (fileId: string, field: 'zoneNumber' | 'measurementLevel', value: string | number) => {
    // Обновляем в базе данных
    try {
      console.log(`Обновляем поле ${field} для файла ${fileId}: ${value}`);
      const fields = field === 'zoneNumber' 
        ? { zoneNumber: typeof value === 'string' ? parseInt(value) || undefined : value }
        : { measurementLevel: value.toString() };
      
      await supabaseDatabaseService.updateFileFields(fileId, fields);
      console.log(`Поле ${field} успешно обновлено в базе данных`);
    } catch (error) {
      console.error('Ошибка обновления поля файла:', error);
      alert('Ошибка обновления поля: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
    
    // Обновляем состояние
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
    
    // Переходим напрямую к анализатору временных рядов
    if (onShowVisualization) {
      onShowVisualization(true);
    }
  };

  // Если показываем визуализацию, рендерим компонент визуализации
  if (showVisualization) {
    return (
      <DataVisualization 
        files={uploadedFiles.filter(f => f.parsingStatus === 'completed')}
        onBack={() => onShowVisualization?.(false)}
      />
    );
  }

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка файлов из базы данных...</p>
        </div>
      </div>
    );
  }

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

      {/* Примечание о внешнем датчике */}
      {uploadedFiles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm font-medium">
            <strong>Примечание:</strong> Для внешнего датчика указать № зоны измерения 999.
          </p>
        </div>
      )}

    </div>
  );
};