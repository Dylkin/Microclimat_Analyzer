import React, { useState, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Clock, X, MessageSquare } from 'lucide-react';

interface ChartDataPoint {
  timestamp: number;
  temperature: number;
  humidity?: number;
  formattedTime: string;
  formattedDate: string;
}

interface VerticalMarker {
  id: string;
  timestamp: number;
  comment: string;
  color: string;
}

interface Limits {
  min: number | null;
  max: number | null;
}

interface InteractiveChartProps {
  data: ChartDataPoint[];
  temperatureLimits: Limits;
  humidityLimits: Limits;
  onMarkersChange?: (temperatureMarkers: VerticalMarker[], humidityMarkers: VerticalMarker[]) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  temperatureLimits,
  humidityLimits,
  onMarkersChange
}) => {
  const [temperatureMarkers, setTemperatureMarkers] = useState<VerticalMarker[]>([]);
  const [humidityMarkers, setHumidityMarkers] = useState<VerticalMarker[]>([]);
  const [editingMarker, setEditingMarker] = useState<{ id: string; type: 'temperature' | 'humidity' } | null>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  
  const temperatureChartRef = useRef<any>(null);
  const humidityChartRef = useRef<any>(null);

  // Подготовка данных для графиков
  const chartData = data.map(point => ({
    ...point,
    formattedTime: new Date(point.timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    formattedDate: new Date(point.timestamp).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  }));

  // Генерация случайного цвета для маркера
  const generateMarkerColor = () => {
    const colors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Обработка двойного клика для добавления маркера
  const handleChartDoubleClick = useCallback((event: any, chartType: 'temperature' | 'humidity') => {
    if (!event || !event.activeLabel) return;

    const timestamp = parseInt(event.activeLabel);
    const newMarker: VerticalMarker = {
      id: `${chartType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      comment: '',
      color: generateMarkerColor()
    };

    if (chartType === 'temperature') {
      const newMarkers = [...temperatureMarkers, newMarker];
      setTemperatureMarkers(newMarkers);
      onMarkersChange?.(newMarkers, humidityMarkers);
    } else {
      const newMarkers = [...humidityMarkers, newMarker];
      setHumidityMarkers(newMarkers);
      onMarkersChange?.(temperatureMarkers, newMarkers);
    }

    setEditingMarker({ id: newMarker.id, type: chartType });
  }, [temperatureMarkers, humidityMarkers, onMarkersChange]);

  // Удаление маркера
  const removeMarker = useCallback((markerId: string, chartType: 'temperature' | 'humidity') => {
    if (chartType === 'temperature') {
      const newMarkers = temperatureMarkers.filter(m => m.id !== markerId);
      setTemperatureMarkers(newMarkers);
      onMarkersChange?.(newMarkers, humidityMarkers);
    } else {
      const newMarkers = humidityMarkers.filter(m => m.id !== markerId);
      setHumidityMarkers(newMarkers);
      onMarkersChange?.(temperatureMarkers, newMarkers);
    }
  }, [temperatureMarkers, humidityMarkers, onMarkersChange]);

  // Обновление комментария маркера
  const updateMarkerComment = useCallback((markerId: string, chartType: 'temperature' | 'humidity', comment: string) => {
    if (chartType === 'temperature') {
      const newMarkers = temperatureMarkers.map(m => 
        m.id === markerId ? { ...m, comment } : m
      );
      setTemperatureMarkers(newMarkers);
      onMarkersChange?.(newMarkers, humidityMarkers);
    } else {
      const newMarkers = humidityMarkers.map(m => 
        m.id === markerId ? { ...m, comment } : m
      );
      setHumidityMarkers(newMarkers);
      onMarkersChange?.(temperatureMarkers, newMarkers);
    }
  }, [temperatureMarkers, humidityMarkers, onMarkersChange]);

  // Синхронизация зума между графиками
  const handleZoomChange = useCallback((domain: [number, number] | null) => {
    setZoomDomain(domain);
  }, []);

  // Сброс зума
  const resetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timestamp = parseInt(label);
      const date = new Date(timestamp);
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {date.toLocaleString('ru-RU')}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value?.toFixed(1)}{entry.name === 'Температура' ? '°C' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Форматирование оси времени
  const formatXAxisTick = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Расчет временных периодов между маркерами
  const calculateTimePeriods = (markers: VerticalMarker[]) => {
    if (markers.length < 2) return [];
    
    const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
    const periods = [];
    
    for (let i = 0; i < sortedMarkers.length - 1; i++) {
      const start = new Date(sortedMarkers[i].timestamp);
      const end = new Date(sortedMarkers[i + 1].timestamp);
      const duration = end.getTime() - start.getTime();
      
      periods.push({
        start: start.toLocaleString('ru-RU'),
        end: end.toLocaleString('ru-RU'),
        duration: formatDuration(duration),
        startComment: sortedMarkers[i].comment,
        endComment: sortedMarkers[i + 1].comment
      });
    }
    
    return periods;
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours}ч ${minutes}м ${seconds}с`;
  };

  if (chartData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Управление масштабом */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Двойной клик для добавления маркера • Перетащите область для увеличения
        </div>
        {zoomDomain && (
          <button
            onClick={resetZoom}
            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            Сбросить масштаб
          </button>
        )}
      </div>

      {/* График температуры */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">График температуры</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              ref={temperatureChartRef}
              data={chartData}
              onDoubleClick={(event) => handleChartDoubleClick(event, 'temperature')}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={zoomDomain || ['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 12 }}
                label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Лимиты температуры */}
              {temperatureLimits.min !== null && (
                <ReferenceLine 
                  y={temperatureLimits.min} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ value: `Мин: ${temperatureLimits.min}°C`, position: 'topLeft' }}
                />
              )}
              {temperatureLimits.max !== null && (
                <ReferenceLine 
                  y={temperatureLimits.max} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ value: `Макс: ${temperatureLimits.max}°C`, position: 'topLeft' }}
                />
              )}

              {/* Вертикальные маркеры */}
              {temperatureMarkers.map(marker => (
                <ReferenceLine
                  key={marker.id}
                  x={marker.timestamp}
                  stroke={marker.color}
                  strokeWidth={2}
                  label={{
                    value: marker.comment || 'Маркер',
                    position: 'top',
                    style: { fontSize: '10px', fill: marker.color }
                  }}
                />
              ))}

              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Температура"
                connectNulls={false}
              />

              {/* Brush для зума */}
              <Brush
                dataKey="timestamp"
                height={30}
                stroke="#8884d8"
                tickFormatter={formatXAxisTick}
                onChange={(brushData) => {
                  if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                    const startTime = chartData[brushData.startIndex]?.timestamp;
                    const endTime = chartData[brushData.endIndex]?.timestamp;
                    if (startTime && endTime) {
                      handleZoomChange([startTime, endTime]);
                    }
                  }
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Управление маркерами температуры */}
        {temperatureMarkers.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Маркеры температуры:</h4>
            <div className="flex flex-wrap gap-2">
              {temperatureMarkers.map(marker => (
                <div key={marker.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: marker.color }}
                  />
                  {editingMarker?.id === marker.id && editingMarker?.type === 'temperature' ? (
                    <input
                      type="text"
                      value={marker.comment}
                      onChange={(e) => updateMarkerComment(marker.id, 'temperature', e.target.value)}
                      onBlur={() => setEditingMarker(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingMarker(null)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 w-24"
                      placeholder="Комментарий"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-xs cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                      onClick={() => setEditingMarker({ id: marker.id, type: 'temperature' })}
                    >
                      {marker.comment || 'Добавить комментарий'}
                    </span>
                  )}
                  <button
                    onClick={() => removeMarker(marker.id, 'temperature')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Временные периоды для температуры */}
        {temperatureMarkers.length >= 2 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Временные периоды (температура):</h4>
            {calculateTimePeriods(temperatureMarkers).map((period, index) => (
              <div key={index} className="text-xs bg-red-50 p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-red-600" />
                  <span className="font-medium">Период {index + 1}:</span>
                </div>
                <div className="mt-1 space-y-1">
                  <div>Начало: {period.start} {period.startComment && `(${period.startComment})`}</div>
                  <div>Конец: {period.end} {period.endComment && `(${period.endComment})`}</div>
                  <div className="font-medium text-red-700">Длительность: {period.duration}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* График влажности */}
      {chartData.some(d => d.humidity !== undefined) && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">График влажности</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                ref={humidityChartRef}
                data={chartData}
                onDoubleClick={(event) => handleChartDoubleClick(event, 'humidity')}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={zoomDomain || ['dataMin', 'dataMax']}
                  tickFormatter={formatXAxisTick}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Влажность (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Лимиты влажности */}
                {humidityLimits.min !== null && (
                  <ReferenceLine 
                    y={humidityLimits.min} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `Мин: ${humidityLimits.min}%`, position: 'topLeft' }}
                  />
                )}
                {humidityLimits.max !== null && (
                  <ReferenceLine 
                    y={humidityLimits.max} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `Макс: ${humidityLimits.max}%`, position: 'topLeft' }}
                  />
                )}

                {/* Вертикальные маркеры */}
                {humidityMarkers.map(marker => (
                  <ReferenceLine
                    key={marker.id}
                    x={marker.timestamp}
                    stroke={marker.color}
                    strokeWidth={2}
                    label={{
                      value: marker.comment || 'Маркер',
                      position: 'top',
                      style: { fontSize: '10px', fill: marker.color }
                    }}
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Влажность"
                  connectNulls={false}
                />

                {/* Brush для зума */}
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke="#8884d8"
                  tickFormatter={formatXAxisTick}
                  onChange={(brushData) => {
                    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                      const startTime = chartData[brushData.startIndex]?.timestamp;
                      const endTime = chartData[brushData.endIndex]?.timestamp;
                      if (startTime && endTime) {
                        handleZoomChange([startTime, endTime]);
                      }
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Управление маркерами влажности */}
          {humidityMarkers.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Маркеры влажности:</h4>
              <div className="flex flex-wrap gap-2">
                {humidityMarkers.map(marker => (
                  <div key={marker.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: marker.color }}
                    />
                    {editingMarker?.id === marker.id && editingMarker?.type === 'humidity' ? (
                      <input
                        type="text"
                        value={marker.comment}
                        onChange={(e) => updateMarkerComment(marker.id, 'humidity', e.target.value)}
                        onBlur={() => setEditingMarker(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingMarker(null)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 w-24"
                        placeholder="Комментарий"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-xs cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                        onClick={() => setEditingMarker({ id: marker.id, type: 'humidity' })}
                      >
                        {marker.comment || 'Добавить комментарий'}
                      </span>
                    )}
                    <button
                      onClick={() => removeMarker(marker.id, 'humidity')}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Временные периоды для влажности */}
          {humidityMarkers.length >= 2 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Временные периоды (влажность):</h4>
              {calculateTimePeriods(humidityMarkers).map((period, index) => (
                <div key={index} className="text-xs bg-blue-50 p-2 rounded border">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="font-medium">Период {index + 1}:</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    <div>Начало: {period.start} {period.startComment && `(${period.startComment})`}</div>
                    <div>Конец: {period.end} {period.endComment && `(${period.endComment})`}</div>
                    <div className="font-medium text-blue-700">Длительность: {period.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};