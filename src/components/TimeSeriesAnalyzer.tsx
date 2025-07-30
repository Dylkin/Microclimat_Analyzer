import React, { useState, useCallback, useMemo } from 'react';
import { BarChart, Settings, Trash2, RotateCcw, Thermometer, Droplets } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { TimeSeriesChart } from './TimeSeriesChart';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack: () => void;
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack }) => {
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chartHeight, setChartHeight] = useState(400);
  const [dataType, setDataType] = useState<DataType>('temperature');

  const { data, loading, progress, error, reload } = useTimeSeriesData({ files });

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
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Настройки</span>
          </button>
          
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
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Настройки отображения</h3>
          
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
        </div>
      )}

      {/* Управление маркерами */}
      {markers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Вертикальные маркеры</h3>
          <div className="space-y-2">
            {markers.map(marker => (
              <div key={marker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: marker.color }}></div>
                  <div>
                    <div className="font-medium">{marker.label}</div>
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
          />
        </div>
      </div>

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