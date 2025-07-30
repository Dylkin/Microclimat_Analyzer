import React, { useState, useCallback, useMemo } from 'react';
import { BarChart, Settings, Trash2, RotateCcw, Thermometer, Droplets, Target, Clock } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { databaseService } from '../utils/database';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack: () => void;
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack }) => {
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | null>(null);
  const [chartHeight, setChartHeight] = useState(400);
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [testType, setTestType] = useState('empty-object');
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState(new Map());

  const { data, loading, progress, error, reload } = useTimeSeriesData({ files });

  const testTypes = [
    { value: 'empty-object', label: 'Соответствие критериям в пустом объекте' },
    { value: 'loaded-object', label: 'Соответствие критериям в загруженном объекте' },
    { value: 'door-opening', label: 'Открытие двери' },
    { value: 'power-off', label: 'Отключение электропитания' },
    { value: 'power-on', label: 'Включение электропитания' }
  ];

  // Размеры графиков
  const chartWidth = Math.min(1400, window.innerWidth - 100);
  const margin = { top: 20, right: 50, bottom: 60, left: 80 };

  // Обработчики лимитов
  const handleLimitChange = useCallback((type: 'temperature' | 'humidity', limitType: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setLimits(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [limitType]: numValue
      }
    }));
  }, []);

  // Обработчик добавления маркера
  const handleMarkerAdd = useCallback((timestamp: number) => {
    const newMarker: VerticalMarker = {
      id: Date.now().toString(),
      timestamp,
      label: `Маркер ${markers.length + 1}`,
      color: '#8b5cf6'
    };
    setMarkers(prev => [...prev, newMarker]);
  }, [markers.length]);

  // Обработчик удаления маркера
  const handleMarkerDelete = useCallback((markerId: string) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  }, []);

  // Обработчик изменения названия маркера
  const handleMarkerLabelChange = useCallback((markerId: string, newLabel: string) => {
    setMarkers(prev => prev.map(m => 
      m.id === markerId ? { ...m, label: newLabel } : m
    ));
  }, []);

  // Обработчик зума
  const handleZoomChange = useCallback((newZoomState: ZoomState) => {
    setZoomState(newZoomState);
  }, []);

  // Сброс зума
  const handleZoomReset = useCallback(() => {
    setZoomState(null);
  }, []);

  // Переключение типа данных
  const handleDataTypeChange = useCallback((newDataType: DataType) => {
    setDataType(newDataType);
  }, []);

  // Загрузка статистики по файлам
  React.useEffect(() => {
    const loadFileStats = async () => {
      const stats = new Map();
      
      for (const file of files) {
        if (file.parsingStatus === 'completed') {
          try {
            const measurements = await databaseService.getMeasurements(file.id);
            if (measurements && measurements.length > 0) {
              const temperatures = measurements
                .map(m => m.temperature)
                .filter(t => t !== undefined) as number[];
              
              if (temperatures.length > 0) {
                const min = Math.min(...temperatures);
                const max = Math.max(...temperatures);
                const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
                
                stats.set(file.id, {
                  min: Math.round(min * 10) / 10,
                  max: Math.round(max * 10) / 10,
                  avg: Math.round(avg * 10) / 10,
                  count: temperatures.length
                });
              }
            }
          } catch (error) {
            console.error(`Error loading stats for file ${file.name}:`, error);
          }
        }
      }
      
      setFileStats(stats);
    };

    if (files.length > 0) {
      loadFileStats();
    }
  }, [files]);

  // Вычисление периода между маркерами
  const markersPeriod = useMemo(() => {
    if (markers.length < 2) return null;
    
    const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
    const startTime = sortedMarkers[0].timestamp;
    const endTime = sortedMarkers[sortedMarkers.length - 1].timestamp;
    const duration = endTime - startTime;
    
    const formatDuration = (ms: number) => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        return `${hours}ч ${minutes}м ${seconds}с`;
      } else if (minutes > 0) {
        return `${minutes}м ${seconds}с`;
      } else {
        return `${seconds}с`;
      }
    };
    
    return {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: formatDuration(duration)
    };
  }, [markers]);

  // Подготовка данных для таблицы результатов
  const resultsTableData = useMemo(() => {
    const sortedFiles = [...files]
      .filter(f => f.parsingStatus === 'completed')
      .sort((a, b) => a.order - b.order);
    
    if (!data) return [];
    
    return sortedFiles.map(file => {
      const fileName = file.name;
      
      // Извлекаем данные из имени файла
      const loggerName = fileName.substring(0, 6);
      const serialNumber = fileName.substring(7, 15); // 8-15 символы (индексы 7-14)
      
      // Фильтруем данные для конкретного файла
      let fileData = data.points.filter(p => p.fileId === fileName && p.temperature !== undefined);
      
      // Применяем зум если установлен
      if (zoomState) {
        fileData = fileData.filter(p => 
          p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
        );
      }
      
      // Вычисляем статистику на основе отфильтрованных данных
      let fileStats = null;
      if (fileData.length > 0) {
        const temperatures = fileData.map(p => p.temperature!);
        const min = Math.min(...temperatures);
        const max = Math.max(...temperatures);
        const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        fileStats = {
          min: Math.round(min * 10) / 10,
          max: Math.round(max * 10) / 10,
          avg: Math.round(avg * 10) / 10,
          count: temperatures.length
        };
      }
      
      // Проверка соответствия лимитам
      let meetsLimits = '-';
      
      if (fileStats && limits.temperature) {
        const tempLimits = limits.temperature;
        let withinLimits = true;
        
        if (tempLimits.min !== undefined && fileStats.min < tempLimits.min) {
          withinLimits = false;
        }
        if (tempLimits.max !== undefined && fileStats.max > tempLimits.max) {
          withinLimits = false;
        }
        
        meetsLimits = withinLimits ? 'Да' : 'Нет';
      }
      
      return {
        fileId: fileName,
        zoneNumber: file.order,
        measurementLevel: '-',
        loggerName,
        serialNumber,
        minTemp: fileStats ? fileStats.min : '-',
        maxTemp: fileStats ? fileStats.max : '-',
        avgTemp: fileStats ? fileStats.avg : '-',
        meetsLimits
      };
    });
  }, [files, data, zoomState, limits]);

  // Вычисление глобальных минимума и максимума
  const globalMinMax = useMemo(() => {
    const validTemps = resultsTableData
      .map(row => [row.minTemp, row.maxTemp])
      .flat()
      .filter(temp => typeof temp === 'number') as number[];
    
    return {
      globalMin: validTemps.length > 0 ? Math.min(...validTemps) : null,
      globalMax: validTemps.length > 0 ? Math.max(...validTemps) : null
    };
  }, [resultsTableData]);

  // Статистика данных
  const stats = useMemo(() => {
    if (!data) return null;

    const totalPoints = data.points.length;
    const tempPoints = data.points.filter(p => p.temperature !== undefined).length;
    const humidityPoints = data.points.filter(p => p.humidity !== undefined).length;
    const timeSpan = data.timeRange[1] - data.timeRange[0];
    const days = Math.ceil(timeSpan / (1000 * 60 * 60 * 24));

    return {
      totalPoints,
      tempPoints,
      humidityPoints,
      days,
      filesLoaded: files.filter(f => f.parsingStatus === 'completed').length,
      totalFiles: files.length,
      hasTemperature: data.hasTemperature,
      hasHumidity: data.hasHumidity
    };
  }, [data, files]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-900 mb-2">Загрузка данных временных рядов</div>
          <div className="text-sm text-gray-600 mb-4">Обработано {progress.toFixed(1)}%</div>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-4">Ошибка загрузки данных</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={reload}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">Нет данных для отображения</div>
          <button
            onClick={onBack}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Вернуться к загрузке файлов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и управление */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BarChart className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Анализ временных рядов</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {zoomState && (
            <button
              onClick={handleZoomReset}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Сбросить зум</span>
            </button>
          )}
          
          <button
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Назад
          </button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Статистика данных</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.filesLoaded}</div>
              <div className="text-gray-600">Файлов загружено</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalPoints.toLocaleString()}</div>
              <div className="text-gray-600">Всего точек</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.tempPoints.toLocaleString()}</div>
              <div className="text-gray-600">Температура</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.humidityPoints.toLocaleString()}</div>
              <div className="text-gray-600">Влажность</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.days}</div>
              <div className="text-gray-600">Дней данных</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{markers.length}</div>
              <div className="text-gray-600">Маркеров</div>
            </div>
          </div>
        </div>
      )}

      {/* Переключатель типа данных */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Тип отображаемых данных</h3>
        <div className="flex space-x-4">
          {stats?.hasTemperature && (
            <button
              onClick={() => handleDataTypeChange('temperature')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                dataType === 'temperature'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Thermometer className="w-5 h-5" />
              <span>Температура</span>
            </button>
          )}
          {stats?.hasHumidity && (
            <button
              onClick={() => handleDataTypeChange('humidity')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                dataType === 'humidity'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Droplets className="w-5 h-5" />
              <span>Влажность</span>
            </button>
          )}
        </div>
      </div>

      {/* Панель настроек */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Настройки отображения</h3>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-sm text-blue-800">
            <strong>Автоматическое масштабирование:</strong>
          </p>
          <ul className="text-sm text-blue-700 space-y-1 ml-4">
            <li>• <strong>По вертикали:</strong> При зуме Y-ось подстраивается под видимые данные</li>
            <li>• <strong>Лимиты:</strong> Установленные лимиты расширяют масштаб для лучшего отображения</li>
            <li>• <strong>Динамическое:</strong> Масштаб автоматически изменяется при изменении временного диапазона</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Лимиты температуры */}
          <div>
            <h4 className="font-medium mb-3 text-red-600">Лимиты температуры</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Минимум (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits.temperature?.min || ''}
                  onChange={(e) => handleLimitChange('temperature', 'min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Максимум (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits.temperature?.max || ''}
                  onChange={(e) => handleLimitChange('temperature', 'max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
            </div>
          </div>

          {/* Лимиты влажности */}
          <div>
            <h4 className="font-medium mb-3 text-blue-600">Лимиты влажности</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Минимум (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits.humidity?.min || ''}
                  onChange={(e) => handleLimitChange('humidity', 'min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Максимум (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits.humidity?.max || ''}
                  onChange={(e) => handleLimitChange('humidity', 'max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
            </div>
          </div>

          {/* Настройки отображения */}
          <div>
            <h4 className="font-medium mb-3 text-green-600">Настройки отображения</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Высота графика (px)</label>
                <input
                  type="number"
                  min="300"
                  max="800"
                  step="50"
                  value={chartHeight}
                  onChange={(e) => setChartHeight(parseInt(e.target.value) || 400)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Исследовательский режим */}
        <div className="md:col-span-3 border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-6 h-6 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-900">Исследовательский режим</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Вид испытаний</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {testTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Данные готовы для анализа и формирования отчета
              </div>
            </div>
          </div>

          {/* Информация о данных */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Информация о загруженных данных:</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Количество файлов:</span> {stats?.filesLoaded || 0}
              </div>
              <div>
                <span className="font-medium">Общее количество записей:</span> {stats?.totalPoints.toLocaleString('ru-RU') || '0'}
              </div>
              <div>
                <span className="font-medium">Период данных:</span> 
                <span className="ml-1">{stats?.days || 0} дней</span>
              </div>
            </div>
            {(!stats || stats.filesLoaded === 0) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Нет обработанных файлов. Загрузите файлы в формате .vi2 для анализа данных.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Управление маркерами */}
      {markers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Вертикальные маркеры</h3>
            {markersPeriod && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>Период испытания: {markersPeriod.duration}</span>
              </div>
            )}
          </div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Редактирование маркеров:</strong> Нажмите на название маркера для редактирования
            </p>
          </div>
          
          {/* Информация о периоде между маркерами */}
          {markersPeriod && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Временной период испытания:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-600">Время начала:</span>
                  <div className="text-gray-900">{markersPeriod.startTime.toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <span className="font-medium text-red-600">Время завершения:</span>
                  <div className="text-gray-900">{markersPeriod.endTime.toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-600">Длительность:</span>
                  <div className="text-gray-900">{markersPeriod.duration}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {markers.map(marker => (
              <div key={marker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: marker.color }}></div>
                  <div>
                    <div className="font-medium">
                      {editingMarker === marker.id ? (
                        <input
                          type="text"
                          value={marker.label || ''}
                          onChange={(e) => handleMarkerLabelChange(marker.id, e.target.value)}
                          onBlur={() => setEditingMarker(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingMarker(null);
                            if (e.key === 'Escape') setEditingMarker(null);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                          placeholder="Введите название маркера"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingMarker(marker.id)}
                          className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          {marker.label || 'Нажмите для редактирования'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(marker.timestamp).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleMarkerDelete(marker.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* График */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className={`text-lg font-semibold mb-4 ${dataType === 'temperature' ? 'text-red-600' : 'text-blue-600'}`}>
          График {dataType === 'temperature' ? 'температуры' : 'влажности'}
        </h3>
        <div className="text-sm text-gray-600 mb-4">
          Двойной клик для добавления маркера • Выделите область мышью для зума
        </div>
        <div className="overflow-x-auto">
          <TimeSeriesChart
            data={data.points}
            width={chartWidth}
            height={chartHeight}
            margin={margin}
            dataType={dataType}
            limits={limits}
            markers={markers}
            zoomState={zoomState}
            onZoomChange={handleZoomChange}
            onMarkerAdd={handleMarkerAdd}
            color={dataType === 'temperature' ? '#ef4444' : '#3b82f6'}
            yAxisLabel={dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'}
            showLegend={true}
          />
        </div>
      </div>

      {/* Таблица результатов - только для температуры */}
      {dataType === 'temperature' && resultsTableData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Таблица результатов</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    № зоны измерения
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Уровень измерения (м.)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Наименование логгера
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Серийный № логгера
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Мин. t°С
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Макс. t°С
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Среднее t°С
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Соответствует заданным критериям
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resultsTableData.map((row, index) => (
                  <tr key={row.fileId} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.zoneNumber}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.measurementLevel}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {row.loggerName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {row.serialNumber}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      typeof row.minTemp === 'number' && row.minTemp === globalMinMax.globalMin 
                        ? 'bg-blue-100 text-blue-900 font-semibold' 
                        : ''
                    }`}>
                      {typeof row.minTemp === 'number' ? `${row.minTemp}°C` : row.minTemp}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      typeof row.maxTemp === 'number' && row.maxTemp === globalMinMax.globalMax 
                        ? 'bg-red-100 text-red-900 font-semibold' 
                        : ''
                    }`}>
                      {typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : row.maxTemp}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : row.avgTemp}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.meetsLimits === 'Да' 
                          ? 'bg-green-100 text-green-800'
                          : row.meetsLimits === 'Нет'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {row.meetsLimits}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Легенда для таблицы */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Обозначения:</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 rounded"></div>
                <span>Глобальное минимальное значение температуры</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 rounded"></div>
                <span>Глобальное максимальное значение температуры</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Да</span>
                <span>Соответствует лимитам</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Нет</span>
                <span>Не соответствует лимитам</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Инструкции */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Инструкции по использованию:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Переключение данных:</strong> Используйте кнопки "Температура" и "Влажность" для выбора типа данных</li>
          <li>• <strong>Зум:</strong> Выделите область на графике левой кнопкой мыши для увеличения</li>
          <li>• <strong>Маркеры:</strong> Двойной клик по графику для добавления вертикального маркера</li>
          <li>• <strong>Tooltip:</strong> Наведите курсор на график для просмотра точных значений</li>
          <li>• <strong>Лимиты:</strong> Установите в настройках для отображения красных пунктирных линий</li>
          <li>• <strong>Производительность:</strong> Компонент автоматически оптимизирует отображение больших наборов данных</li>
        </ul>
      </div>
    </div>
  );
};