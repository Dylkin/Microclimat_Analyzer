import React, { useState, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Clock, RotateCcw } from 'lucide-react';

interface ChartData {
  timestamp: number;
  value: number;
  fileId: string;
  fileName: string;
}

interface VerticalLine {
  id: string;
  timestamp: number;
  comment: string;
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
  lines: VerticalLine[];
  onAddLine: (timestamp: number) => void;
  onUpdateLineComment: (lineId: string, comment: string) => void;
  onRemoveLine: (lineId: string) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  title,
  unit,
  color,
  limits,
  lines,
  onAddLine,
  onUpdateLineComment,
  onRemoveLine
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  // Подготовка данных для Recharts
  const chartData = data.map(d => ({
    timestamp: d.timestamp,
    value: d.value,
    formattedTime: new Date(d.timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  // Обработка выбора области для зума
  const handleMouseDown = useCallback((e: any) => {
    if (e && e.activeLabel) {
      setIsSelecting(true);
      setSelectionStart(e.activeLabel);
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    if (isSelecting && selectionStart && e && e.activeLabel) {
      // Визуальная обратная связь при выделении
    }
  }, [isSelecting, selectionStart]);

  const handleMouseUp = useCallback((e: any) => {
    if (isSelecting && selectionStart && e && e.activeLabel) {
      const start = Math.min(selectionStart, e.activeLabel);
      const end = Math.max(selectionStart, e.activeLabel);
      
      // Устанавливаем зум только если выделена достаточная область
      if (Math.abs(end - start) > 60000) { // минимум 1 минута
        setZoomDomain([start, end]);
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
  }, [isSelecting, selectionStart]);

  // Обработка двойного клика для добавления вертикальной линии
  const handleDoubleClick = useCallback((e: any) => {
    if (e && e.activeLabel) {
      onAddLine(e.activeLabel);
    }
  }, [onAddLine]);

  // Сброс зума
  const resetZoom = () => {
    setZoomDomain(null);
  };

  // Форматирование времени для оси X
  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Кастомный тултип
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="text-sm font-medium">
            {date.toLocaleString('ru-RU')}
          </p>
          <p className="text-sm text-blue-600">
            {`${title}: ${payload[0].value.toFixed(1)} ${unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Расчет временных периодов
  const calculateTimePeriods = () => {
    if (lines.length < 2) return [];
    
    const sortedLines = [...lines].sort((a, b) => a.timestamp - b.timestamp);
    const periods = [];
    
    for (let i = 0; i < sortedLines.length - 1; i++) {
      const start = new Date(sortedLines[i].timestamp);
      const end = new Date(sortedLines[i + 1].timestamp);
      const duration = end.getTime() - start.getTime();
      
      periods.push({
        start: start.toLocaleString('ru-RU'),
        end: end.toLocaleString('ru-RU'),
        duration: formatDuration(duration),
        startComment: sortedLines[i].comment,
        endComment: sortedLines[i + 1].comment
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

  // Определение домена для оси X
  const xAxisDomain = zoomDomain || [
    Math.min(...chartData.map(d => d.timestamp)),
    Math.max(...chartData.map(d => d.timestamp))
  ];

  return (
    <div className="space-y-4">
      {/* Управление графиком */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Зажмите левую кнопку мыши и выделите область для увеличения. Двойной клик для добавления вертикальной линии.
        </div>
        <div className="flex space-x-2">
          {zoomDomain && (
            <button
              onClick={resetZoom}
              className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить масштаб</span>
            </button>
          )}
        </div>
      </div>

      {/* График */}
      <div className="h-80 bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            ref={chartRef}
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={xAxisDomain}
              tickFormatter={formatXAxisLabel}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              label={{ 
                value: `${title} (${unit})`, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Основная линия данных */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
            />

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

            {/* Вертикальные линии */}
            {lines.map(line => (
              <ReferenceLine
                key={line.id}
                x={line.timestamp}
                stroke="#8b5cf6"
                strokeWidth={2}
                label={{
                  value: line.comment || 'Метка',
                  position: 'top',
                  offset: 10
                }}
              />
            ))}

            {/* Brush для навигации */}
            {!zoomDomain && (
              <Brush
                dataKey="timestamp"
                height={30}
                stroke={color}
                tickFormatter={formatXAxisLabel}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Комментарии к линиям */}
      {lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Комментарии к меткам:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lines.map(line => (
              <div key={line.id} className="flex items-center space-x-2 bg-purple-50 p-2 rounded">
                <div className="text-xs text-purple-600 font-medium">
                  {new Date(line.timestamp).toLocaleString('ru-RU')}
                </div>
                {editingComment === line.id ? (
                  <input
                    type="text"
                    value={line.comment}
                    onChange={(e) => onUpdateLineComment(line.id, e.target.value)}
                    onBlur={() => setEditingComment(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingComment(null)}
                    className="flex-1 px-2 py-1 text-xs border border-purple-300 rounded"
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex-1 text-xs cursor-pointer hover:bg-purple-100 px-2 py-1 rounded"
                    onClick={() => setEditingComment(line.id)}
                  >
                    {line.comment || 'Нажмите для добавления комментария'}
                  </div>
                )}
                <button
                  onClick={() => onRemoveLine(line.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Временные периоды */}
      {lines.length >= 2 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Временные периоды:</h4>
          {calculateTimePeriods().map((period, index) => (
            <div key={index} className="text-xs bg-blue-50 p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="font-medium">Период {index + 1}:</span>
              </div>
              <div className="space-y-1">
                <div>Начало: {period.start} {period.startComment && `(${period.startComment})`}</div>
                <div>Конец: {period.end} {period.endComment && `(${period.endComment})`}</div>
                <div className="font-medium text-blue-700">Длительность: {period.duration}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};