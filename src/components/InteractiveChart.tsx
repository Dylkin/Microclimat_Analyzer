import React, { useState, useRef, useCallback } from 'react';
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
import { X, MessageSquare, Clock } from 'lucide-react';

interface ChartData {
  timestamp: number;
  value: number;
  formattedTime: string;
  fileId: string;
  fileName: string;
}

interface VerticalMarker {
  id: string;
  timestamp: number;
  comment: string;
  x?: number;
}

interface Limits {
  min: number | null;
  max: number | null;
}

interface InteractiveChartProps {
  data: ChartData[];
  title: string;
  unit: string;
  color: string;
  limits: Limits;
  markers: VerticalMarker[];
  onAddMarker: (timestamp: number) => void;
  onUpdateMarker: (markerId: string, comment: string) => void;
  onRemoveMarker: (markerId: string) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  title,
  unit,
  color,
  limits,
  markers,
  onAddMarker,
  onUpdateMarker,
  onRemoveMarker
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const chartRef = useRef<any>(null);

  // Форматирование времени для отображения
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование времени для тултипа
  const formatTooltipTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Обработка двойного клика для добавления маркера
  const handleChartDoubleClick = useCallback((event: any) => {
    if (!event || !event.activeLabel) return;
    
    const timestamp = parseInt(event.activeLabel);
    if (!isNaN(timestamp)) {
      onAddMarker(timestamp);
    }
  }, [onAddMarker]);

  // Обработка зума через Brush
  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const startTimestamp = data[brushData.startIndex]?.timestamp;
      const endTimestamp = data[brushData.endIndex]?.timestamp;
      
      if (startTimestamp && endTimestamp) {
        setZoomDomain([startTimestamp, endTimestamp]);
      }
    }
  }, [data]);

  // Сброс зума
  const resetZoom = () => {
    setZoomDomain(null);
  };

  // Получение видимых данных
  const getVisibleData = () => {
    if (!zoomDomain) return data;
    
    return data.filter(d => 
      d.timestamp >= zoomDomain[0] && d.timestamp <= zoomDomain[1]
    );
  };

  // Получение видимых маркеров
  const getVisibleMarkers = () => {
    if (!zoomDomain) return markers;
    
    return markers.filter(m => 
      m.timestamp >= zoomDomain[0] && m.timestamp <= zoomDomain[1]
    );
  };

  // Вычисление временных периодов между маркерами
  const calculateTimePeriods = () => {
    const visibleMarkers = getVisibleMarkers();
    if (visibleMarkers.length < 2) return [];
    
    const sortedMarkers = [...visibleMarkers].sort((a, b) => a.timestamp - b.timestamp);
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

  // Форматирование длительности
  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours}ч ${minutes}м ${seconds}с`;
  };

  const visibleData = getVisibleData();
  const visibleMarkers = getVisibleMarkers();
  const timePeriods = calculateTimePeriods();

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatTooltipTime(parseInt(label))}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium" style={{ color: payload[0].color }}>
              {title}:
            </span>
            {` ${payload[0].value.toFixed(1)} ${unit}`}
          </p>
          {payload[0].payload.fileName && (
            <p className="text-xs text-gray-500 mt-1">
              Файл: {payload[0].payload.fileName}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и управление */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-3">
          {zoomDomain && (
            <button
              onClick={resetZoom}
              className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              Сбросить масштаб
            </button>
          )}
          <div className="text-xs text-gray-500">
            Двойной клик для добавления маркера
          </div>
        </div>
      </div>

      {/* График */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            ref={chartRef}
            data={visibleData}
            onDoubleClick={handleChartDoubleClick}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={zoomDomain || ['dataMin', 'dataMax']}
              tickFormatter={formatTime}
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis
              domain={['dataMin - 1', 'dataMax + 1']}
              tick={{ fontSize: 10 }}
              label={{ 
                value: `${title} (${unit})`, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend />
            
            {/* Лимиты */}
            {limits.min !== null && (
              <ReferenceLine
                y={limits.min}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: `Мин: ${limits.min}${unit}`, position: 'topLeft' }}
              />
            )}
            
            {limits.max !== null && (
              <ReferenceLine
                y={limits.max}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: `Макс: ${limits.max}${unit}`, position: 'topLeft' }}
              />
            )}
            
            {/* Вертикальные маркеры */}
            {visibleMarkers.map(marker => (
              <ReferenceLine
                key={marker.id}
                x={marker.timestamp}
                stroke="#8b5cf6"
                strokeWidth={2}
                label={{
                  value: marker.comment || 'Маркер',
                  position: 'top',
                  offset: 10
                }}
              />
            ))}
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={title}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Brush для зума */}
        {!zoomDomain && data.length > 0 && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={data}>
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  tickFormatter={formatTime}
                  tick={{ fontSize: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1}
                  dot={false}
                />
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke={color}
                  onChange={handleBrushChange}
                  tickFormatter={formatTime}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Управление маркерами */}
      {visibleMarkers.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Маркеры на графике:
          </h4>
          <div className="space-y-2">
            {visibleMarkers.map(marker => (
              <div key={marker.id} className="flex items-center space-x-3 bg-white p-2 rounded border">
                <div className="text-xs text-gray-600 min-w-0 flex-1">
                  {formatTooltipTime(marker.timestamp)}
                </div>
                {editingMarker === marker.id ? (
                  <input
                    type="text"
                    value={marker.comment}
                    onChange={(e) => onUpdateMarker(marker.id, e.target.value)}
                    onBlur={() => setEditingMarker(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMarker(null)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Введите комментарий"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingMarker(marker.id)}
                    className="flex-1 text-xs text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  >
                    {marker.comment || 'Нажмите для добавления комментария'}
                  </div>
                )}
                <button
                  onClick={() => onRemoveMarker(marker.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="Удалить маркер"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Временные периоды */}
      {timePeriods.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Временные периоды:
          </h4>
          <div className="space-y-3">
            {timePeriods.map((period, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-blue-700">Период {index + 1}:</span>
                  <span className="text-sm font-bold text-blue-800">{period.duration}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Начало:</span> {period.start}
                    {period.startComment && (
                      <div className="text-gray-500 italic">"{period.startComment}"</div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Конец:</span> {period.end}
                    {period.endComment && (
                      <div className="text-gray-500 italic">"{period.endComment}"</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};