import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, ZoomIn } from 'lucide-react';

interface DataPoint {
  timestamp: number;
  value: number;
  fileId: string;
  fileName: string;
}

interface VerticalMarker {
  id: string;
  timestamp: number;
  comment: string;
  x: number;
}

interface Limits {
  min: number | null;
  max: number | null;
}

interface ZoomState {
  startTime: number;
  endTime: number;
  isZoomed: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  timestamp: number;
  value: number;
  fileName: string;
  visible: boolean;
}

interface TimeSeriesChartProps {
  data: DataPoint[];
  title: string;
  unit: string;
  color: string;
  limits: Limits;
  markers: VerticalMarker[];
  onMarkersChange: (markers: VerticalMarker[]) => void;
  height?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  unit,
  color,
  limits,
  markers,
  onMarkersChange,
  height = 400
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [zoom, setZoom] = useState<ZoomState>({
    startTime: 0,
    endTime: 0,
    isZoomed: false
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; time: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    timestamp: 0,
    value: 0,
    fileName: '',
    visible: false
  });
  
  const [editingMarker, setEditingMarker] = useState<string | null>(null);

  // Константы для отступов
  const MARGIN = { top: 20, right: 30, bottom: 60, left: 60 };
  const CHART_WIDTH = 800;
  const CHART_HEIGHT = height - MARGIN.top - MARGIN.bottom;

  // Инициализация зума при изменении данных
  useEffect(() => {
    if (data.length > 0) {
      const minTime = Math.min(...data.map(d => d.timestamp));
      const maxTime = Math.max(...data.map(d => d.timestamp));
      setZoom({
        startTime: minTime,
        endTime: maxTime,
        isZoomed: false
      });
    }
  }, [data]);

  // Получение видимых данных в соответствии с текущим зумом
  const getVisibleData = useCallback(() => {
    if (!zoom.startTime || !zoom.endTime) return data;
    return data.filter(d => d.timestamp >= zoom.startTime && d.timestamp <= zoom.endTime);
  }, [data, zoom]);

  // Преобразование времени в X координату
  const timeToX = useCallback((timestamp: number) => {
    const visibleData = getVisibleData();
    if (visibleData.length === 0) return MARGIN.left;
    
    const minTime = Math.min(...visibleData.map(d => d.timestamp));
    const maxTime = Math.max(...visibleData.map(d => d.timestamp));
    const timeRange = maxTime - minTime;
    
    if (timeRange === 0) return MARGIN.left;
    
    const ratio = (timestamp - minTime) / timeRange;
    return MARGIN.left + ratio * CHART_WIDTH;
  }, [getVisibleData]);

  // Преобразование X координаты во время
  const xToTime = useCallback((x: number) => {
    const visibleData = getVisibleData();
    if (visibleData.length === 0) return 0;
    
    const minTime = Math.min(...visibleData.map(d => d.timestamp));
    const maxTime = Math.max(...visibleData.map(d => d.timestamp));
    const timeRange = maxTime - minTime;
    
    const ratio = (x - MARGIN.left) / CHART_WIDTH;
    return minTime + ratio * timeRange;
  }, [getVisibleData]);

  // Преобразование значения в Y координату
  const valueToY = useCallback((value: number) => {
    const visibleData = getVisibleData();
    if (visibleData.length === 0) return MARGIN.top;
    
    const values = visibleData.map(d => d.value);
    const minValue = Math.min(...values, limits.min || Infinity);
    const maxValue = Math.max(...values, limits.max || -Infinity);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;
    
    if (adjustedRange === 0) return MARGIN.top + CHART_HEIGHT / 2;
    
    const ratio = (value - adjustedMin) / adjustedRange;
    return MARGIN.top + CHART_HEIGHT - ratio * CHART_HEIGHT;
  }, [getVisibleData, limits]);

  // Обработка начала перетаскивания
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.detail === 2) return; // Игнорируем двойной клик
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const time = xToTime(x);
    
    setIsDragging(true);
    setDragStart({ x, time });
    setDragEnd(null);
  };

  // Обработка перетаскивания
  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Обновление tooltip
    if (x >= MARGIN.left && x <= MARGIN.left + CHART_WIDTH && 
        y >= MARGIN.top && y <= MARGIN.top + CHART_HEIGHT) {
      
      const time = xToTime(x);
      const visibleData = getVisibleData();
      
      // Находим ближайшую точку данных
      let closestPoint = null;
      let minDistance = Infinity;
      
      for (const point of visibleData) {
        const pointX = timeToX(point.timestamp);
        const distance = Math.abs(pointX - x);
        if (distance < minDistance && distance < 20) { // 20px tolerance
          minDistance = distance;
          closestPoint = point;
        }
      }
      
      if (closestPoint) {
        setTooltip({
          x: x + 10,
          y: y - 10,
          timestamp: closestPoint.timestamp,
          value: closestPoint.value,
          fileName: closestPoint.fileName,
          visible: true
        });
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
    
    // Обновление области выделения при перетаскивании
    if (isDragging && dragStart) {
      const time = xToTime(x);
      setDragEnd({ x, time });
    }
  };

  // Обработка окончания перетаскивания
  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      const minTime = Math.min(dragStart.time, dragEnd.time);
      const maxTime = Math.max(dragStart.time, dragEnd.time);
      
      // Минимальная ширина выделения для зума (5% от текущего диапазона)
      const currentRange = zoom.endTime - zoom.startTime;
      if (maxTime - minTime > currentRange * 0.05) {
        setZoom({
          startTime: minTime,
          endTime: maxTime,
          isZoomed: true
        });
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Обработка двойного клика для добавления маркера
  const handleDoubleClick = (event: React.MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const time = xToTime(x);
    
    const newMarker: VerticalMarker = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: time,
      comment: '',
      x
    };
    
    onMarkersChange([...markers, newMarker]);
    setEditingMarker(newMarker.id);
  };

  // Сброс зума
  const resetZoom = () => {
    if (data.length > 0) {
      const minTime = Math.min(...data.map(d => d.timestamp));
      const maxTime = Math.max(...data.map(d => d.timestamp));
      setZoom({
        startTime: minTime,
        endTime: maxTime,
        isZoomed: false
      });
    }
  };

  // Удаление маркера
  const removeMarker = (markerId: string) => {
    onMarkersChange(markers.filter(m => m.id !== markerId));
  };

  // Обновление комментария маркера
  const updateMarkerComment = (markerId: string, comment: string) => {
    onMarkersChange(markers.map(m => 
      m.id === markerId ? { ...m, comment } : m
    ));
  };

  // Форматирование времени для отображения
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Генерация временных меток для оси X
  const generateTimeLabels = () => {
    const visibleData = getVisibleData();
    if (visibleData.length === 0) return [];
    
    const minTime = Math.min(...visibleData.map(d => d.timestamp));
    const maxTime = Math.max(...visibleData.map(d => d.timestamp));
    const timeRange = maxTime - minTime;
    
    const labelCount = 6;
    const labels = [];
    
    for (let i = 0; i < labelCount; i++) {
      const time = minTime + (i / (labelCount - 1)) * timeRange;
      const x = timeToX(time);
      labels.push({ x, time, label: formatTime(time) });
    }
    
    return labels;
  };

  // Генерация меток значений для оси Y
  const generateValueLabels = () => {
    const visibleData = getVisibleData();
    if (visibleData.length === 0) return [];
    
    const values = visibleData.map(d => d.value);
    const minValue = Math.min(...values, limits.min || Infinity);
    const maxValue = Math.max(...values, limits.max || -Infinity);
    const range = maxValue - minValue;
    const padding = range * 0.1;
    
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    
    const labelCount = 5;
    const labels = [];
    
    for (let i = 0; i < labelCount; i++) {
      const value = adjustedMax - (i / (labelCount - 1)) * (adjustedMax - adjustedMin);
      const y = valueToY(value);
      labels.push({ y, value: value.toFixed(1) });
    }
    
    return labels;
  };

  const visibleData = getVisibleData();
  const timeLabels = generateTimeLabels();
  const valueLabels = generateValueLabels();

  return (
    <div className="space-y-4">
      {/* Заголовок и управление */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {zoom.isZoomed && (
            <button
              onClick={resetZoom}
              className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить масштаб</span>
            </button>
          )}
          <div className="text-xs text-gray-500 flex items-center space-x-1">
            <ZoomIn className="w-3 h-3" />
            <span>Перетащите для увеличения • Двойной клик для маркера</span>
          </div>
        </div>
      </div>

      {/* График */}
      <div
        ref={chartRef}
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-crosshair select-none"
        style={{ height: height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setTooltip(prev => ({ ...prev, visible: false }));
          handleMouseUp();
        }}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="absolute inset-0"
        >
          {/* Сетка */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Временные метки (ось X) */}
          {timeLabels.map((label, i) => (
            <g key={`time-${i}`}>
              <line
                x1={label.x}
                y1={MARGIN.top}
                x2={label.x}
                y2={MARGIN.top + CHART_HEIGHT}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={label.x}
                y={height - 20}
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {label.label}
              </text>
            </g>
          ))}

          {/* Метки значений (ось Y) */}
          {valueLabels.map((label, i) => (
            <g key={`value-${i}`}>
              <line
                x1={MARGIN.left}
                y1={label.y}
                x2={MARGIN.left + CHART_WIDTH}
                y2={label.y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={MARGIN.left - 10}
                y={label.y + 3}
                fill="#6b7280"
                fontSize="10"
                textAnchor="end"
                className="pointer-events-none"
              >
                {label.value}
              </text>
            </g>
          ))}

          {/* Лимиты */}
          {limits.min !== null && (
            <line
              x1={MARGIN.left}
              y1={valueToY(limits.min)}
              x2={MARGIN.left + CHART_WIDTH}
              y2={valueToY(limits.min)}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
          
          {limits.max !== null && (
            <line
              x1={MARGIN.left}
              y1={valueToY(limits.max)}
              x2={MARGIN.left + CHART_WIDTH}
              y2={valueToY(limits.max)}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Линия данных */}
          {visibleData.length > 1 && (
            <polyline
              points={visibleData.map(d => `${timeToX(d.timestamp)},${valueToY(d.value)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              className="pointer-events-none"
            />
          )}

          {/* Точки данных */}
          {visibleData.map((point, i) => (
            <circle
              key={i}
              cx={timeToX(point.timestamp)}
              cy={valueToY(point.value)}
              r="2"
              fill={color}
              className="pointer-events-none"
            />
          ))}

          {/* Вертикальные маркеры */}
          {markers.map(marker => {
            const x = timeToX(marker.timestamp);
            const isVisible = x >= MARGIN.left && x <= MARGIN.left + CHART_WIDTH;
            
            if (!isVisible) return null;
            
            return (
              <g key={marker.id}>
                <line
                  x1={x}
                  y1={MARGIN.top}
                  x2={x}
                  y2={MARGIN.top + CHART_HEIGHT}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={MARGIN.top + 10}
                  r="6"
                  fill="#8b5cf6"
                  className="cursor-pointer hover:fill-purple-700"
                  onClick={() => removeMarker(marker.id)}
                  title="Нажмите для удаления"
                />
                <text
                  x={x}
                  y={MARGIN.top + 15}
                  fill="white"
                  fontSize="8"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  ×
                </text>
              </g>
            );
          })}

          {/* Область выделения при перетаскивании */}
          {isDragging && dragStart && dragEnd && (
            <rect
              x={Math.min(dragStart.x, dragEnd.x)}
              y={MARGIN.top}
              width={Math.abs(dragEnd.x - dragStart.x)}
              height={CHART_HEIGHT}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth="1"
              className="pointer-events-none"
            />
          )}

          {/* Подписи осей */}
          <text
            x={MARGIN.left + CHART_WIDTH / 2}
            y={height - 5}
            fill="#6b7280"
            fontSize="12"
            textAnchor="middle"
            className="pointer-events-none"
          >
            Время
          </text>
          
          <text
            x={15}
            y={MARGIN.top + CHART_HEIGHT / 2}
            fill="#6b7280"
            fontSize="12"
            textAnchor="middle"
            transform={`rotate(-90 15 ${MARGIN.top + CHART_HEIGHT / 2})`}
            className="pointer-events-none"
          >
            {title} ({unit})
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div>{formatTime(tooltip.timestamp)}</div>
            <div className="font-semibold">{tooltip.value.toFixed(1)} {unit}</div>
            <div className="text-gray-300">{tooltip.fileName}</div>
          </div>
        )}

        {/* Комментарии к маркерам */}
        {markers.map(marker => {
          const x = timeToX(marker.timestamp);
          const isVisible = x >= MARGIN.left && x <= MARGIN.left + CHART_WIDTH;
          
          if (!isVisible) return null;
          
          return (
            <div
              key={`comment-${marker.id}`}
              className="absolute"
              style={{
                left: x - 50,
                top: MARGIN.top + 30,
                width: 100
              }}
            >
              {editingMarker === marker.id ? (
                <input
                  type="text"
                  value={marker.comment}
                  onChange={(e) => updateMarkerComment(marker.id, e.target.value)}
                  onBlur={() => setEditingMarker(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingMarker(null);
                    if (e.key === 'Escape') setEditingMarker(null);
                  }}
                  className="w-full px-2 py-1 text-xs border border-purple-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Комментарий"
                  autoFocus
                />
              ) : (
                <div
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer text-center truncate hover:bg-purple-200 transition-colors"
                  onClick={() => setEditingMarker(marker.id)}
                  title={marker.comment || 'Нажмите для добавления комментария'}
                >
                  {marker.comment || 'Комментарий'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Информация о данных */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <div>
          Записей: {visibleData.length.toLocaleString('ru-RU')} 
          {zoom.isZoomed && ` из ${data.length.toLocaleString('ru-RU')}`}
        </div>
        {visibleData.length > 0 && (
          <div>
            Период: {formatTime(Math.min(...visibleData.map(d => d.timestamp)))} - 
            {formatTime(Math.max(...visibleData.map(d => d.timestamp)))}
          </div>
        )}
      </div>
    </div>
  );
};