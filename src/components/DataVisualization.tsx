import React, { useState, useRef, useEffect } from 'react';
import { BarChart, FileText, Calendar, Building, Settings, Target, Clock, MessageSquare, Download, ArrowLeft } from 'lucide-react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { databaseService } from '../utils/database';

interface DataVisualizationProps {
  files: UploadedFile[];
  onBack: () => void;
}

interface ResearchInfo {
  reportNumber: string;
  reportDate: string;
  templateFile: File | null;
  objectName: string;
  climateSystemName: string;
}

interface Limits {
  min: number | null;
  max: number | null;
}

interface VerticalLine {
  id: string;
  value: number;
  comment: string;
  y: number;
}

interface ChartData {
  timestamp: number;
  temperature: number;
  humidity?: number;
  fileId: string;
  fileName: string;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, onBack }) => {
  const [researchInfo, setResearchInfo] = useState<ResearchInfo>({
    reportNumber: '',
    reportDate: new Date().toISOString().split('T')[0],
    templateFile: null,
    objectName: '',
    climateSystemName: ''
  });

  const [temperatureLimits, setTemperatureLimits] = useState<Limits>({ min: null, max: null });
  const [humidityLimits, setHumidityLimits] = useState<Limits>({ min: null, max: null });
  const [testType, setTestType] = useState('empty-object');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [temperatureLines, setTemperatureLines] = useState<VerticalLine[]>([]);
  const [humidityLines, setHumidityLines] = useState<VerticalLine[]>([]);
  const [editingComment, setEditingComment] = useState<{ lineId: string; chartType: 'temperature' | 'humidity' } | null>(null);
  const [temperatureZoom, setTemperatureZoom] = useState<{ min: number; max: number } | null>(null);
  const [humidityZoom, setHumidityZoom] = useState<{ min: number; max: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState<{ chartType: 'temperature' | 'humidity'; startY: number } | null>(null);

  const temperatureChartRef = useRef<HTMLDivElement>(null);
  const humidityChartRef = useRef<HTMLDivElement>(null);
  const researchInfoRef = useRef<HTMLDivElement>(null);

  const testTypes = [
    { value: 'empty-object', label: 'Соответствие критериям в пустом объекте' },
    { value: 'loaded-object', label: 'Соответствие критериям в загруженном объекте' },
    { value: 'door-opening', label: 'Открытие двери' },
    { value: 'power-off', label: 'Отключение электропитания' },
    { value: 'power-on', label: 'Включение электропитания' }
  ];

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadChartData();
    // Автоматический фокус на блок информации для исследования
    setTimeout(() => {
      researchInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [files]);

  const loadChartData = async () => {
    const allData: ChartData[] = [];
    
    for (const file of files.filter(f => f.parsingStatus === 'completed')) {
      try {
        const measurements = await databaseService.getMeasurements(file.id);
        if (measurements) {
          const fileData = measurements.map(m => ({
            timestamp: m.timestamp.getTime(),
            temperature: m.temperature,
            humidity: m.humidity,
            fileId: file.id,
            fileName: file.name
          }));
          allData.push(...fileData);
        }
      } catch (error) {
        console.error(`Ошибка загрузки данных для файла ${file.name}:`, error);
      }
    }
    
    // Сортируем по времени
    allData.sort((a, b) => a.timestamp - b.timestamp);
    setChartData(allData);
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setResearchInfo(prev => ({ ...prev, templateFile: file }));
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const handleChartDoubleClick = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const chartHeight = rect.height - 60; // Учитываем отступы
    
    // Определяем диапазон значений для текущего графика
    const values = chartData.map(d => d[chartType === 'temperature' ? 'temperature' : 'humidity']).filter(v => v !== undefined) as number[];
    if (values.length === 0) return;
    
    const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const minValue = currentZoom?.min ?? Math.min(...values);
    const maxValue = currentZoom?.max ?? Math.max(...values);
    const range = maxValue - minValue;
    
    // Вычисляем значение по Y координате (инвертируем, так как Y=0 вверху)
    const value = maxValue - ((y - 30) / chartHeight) * range;
    
    const newLine: VerticalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      value,
      comment: '',
      y
    };

    if (chartType === 'temperature') {
      setTemperatureLines(prev => [...prev, newLine]);
    } else {
      setHumidityLines(prev => [...prev, newLine]);
    }

    setEditingComment({ lineId: newLine.id, chartType });
  };

  const handleChartMouseDown = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (event.detail === 2) return; // Игнорируем если это двойной клик
    
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    
    setIsSelecting({ chartType, startY: y });
  };

  const handleChartMouseUp = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (!isSelecting || isSelecting.chartType !== chartType) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const endY = event.clientY - rect.top;
    const startY = isSelecting.startY;
    
    // Минимальная высота выделения для зума
    if (Math.abs(endY - startY) < 20) {
      setIsSelecting(null);
      return;
    }
    
    const chartHeight = rect.height - 60;
    const values = chartData.map(d => d[chartType === 'temperature' ? 'temperature' : 'humidity']).filter(v => v !== undefined) as number[];
    
    if (values.length === 0) {
      setIsSelecting(null);
      return;
    }
    
    const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const minValue = currentZoom?.min ?? Math.min(...values);
    const maxValue = currentZoom?.max ?? Math.max(...values);
    const range = maxValue - minValue;
    
    // Вычисляем новые границы зума (инвертируем Y координаты)
    const topY = Math.min(startY, endY);
    const bottomY = Math.max(startY, endY);
    
    const newMax = maxValue - ((topY - 30) / chartHeight) * range;
    const newMin = maxValue - ((bottomY - 30) / chartHeight) * range;
    
    const newZoom = { min: newMin, max: newMax };
    
    if (chartType === 'temperature') {
      setTemperatureZoom(newZoom);
    } else {
      setHumidityZoom(newZoom);
    }
    
    setIsSelecting(null);
  };

  const resetZoom = (chartType: 'temperature' | 'humidity') => {
    if (chartType === 'temperature') {
      setTemperatureZoom(null);
    } else {
      setHumidityZoom(null);
    }
  };

  const updateLineComment = (lineId: string, chartType: 'temperature' | 'humidity', comment: string) => {
    if (chartType === 'temperature') {
      setTemperatureLines(prev => prev.map(line => 
        line.id === lineId ? { ...line, comment } : line
      ));
    } else {
      setHumidityLines(prev => prev.map(line => 
        line.id === lineId ? { ...line, comment } : line
      ));
    }
  };

  const removeVerticalLine = (lineId: string, chartType: 'temperature' | 'humidity') => {
    if (chartType === 'temperature') {
      setTemperatureLines(prev => prev.filter(line => line.id !== lineId));
    } else {
      setHumidityLines(prev => prev.filter(line => line.id !== lineId));
    }
  };

  const calculateTimePeriods = (lines: VerticalLine[]) => {
    if (lines.length < 2) return [];
    
    const sortedLines = [...lines].sort((a, b) => a.value - b.value);
    const periods = [];
    
    for (let i = 0; i < sortedLines.length - 1; i++) {
      const startValue = sortedLines[i].value;
      const endValue = sortedLines[i + 1].value;
      const difference = Math.abs(endValue - startValue);
      
      periods.push({
        start: `${startValue.toFixed(1)}`,
        end: `${endValue.toFixed(1)}`,
        difference: `${difference.toFixed(1)}`,
        startComment: sortedLines[i].comment,
        endComment: sortedLines[i + 1].comment
      });
    }
    
    return periods;
  };

  const renderChart = (
    data: ChartData[],
    valueKey: 'temperature' | 'humidity',
    limits: Limits,
    lines: VerticalLine[],
    chartType: 'temperature' | 'humidity',
    title: string,
    unit: string,
    color: string,
    zoom: { min: number; max: number } | null
  ) => {
    if (data.length === 0) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      );
    }

    const values = data.map(d => d[valueKey]).filter(v => v !== undefined) as number[];
    const allMinValue = Math.min(...values);
    const allMaxValue = Math.max(...values);
    
    // Используем зум если установлен, иначе полный диапазон
    const minValue = zoom?.min ?? allMinValue;
    const maxValue = zoom?.max ?? allMaxValue;
    const range = maxValue - minValue;
    
    // Фильтруем данные по времени для отображения
    const timeValues = data.map(d => d.timestamp);
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const timeRange = maxTime - minTime;

    return (
      <div className="relative">
        {/* Кнопки управления */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            {zoom && (
              <button
                onClick={() => resetZoom(chartType)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Сбросить масштаб
              </button>
            )}
            <div className="text-xs text-gray-500">
              Выделите область для масштабирования
            </div>
          </div>
        </div>
        
        <div
          ref={chartType === 'temperature' ? temperatureChartRef : humidityChartRef}
          className="h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden"
          onDoubleClick={(e) => handleChartDoubleClick(e, chartType)}
          onMouseDown={(e) => handleChartMouseDown(e, chartType)}
          onMouseUp={(e) => handleChartMouseUp(e, chartType)}
          title="Двойной клик для добавления вертикальной линии"
        >
          {/* Область выделения */}
          {isSelecting && isSelecting.chartType === chartType && (
            <div
              className="absolute bg-blue-200 bg-opacity-50 border border-blue-400 pointer-events-none"
              style={{
                left: 40,
                right: 40,
                top: Math.min(isSelecting.startY, isSelecting.startY),
                height: Math.abs(isSelecting.startY - isSelecting.startY)
              }}
            />
          )}
          
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Горизонтальные линии сетки (значения) */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={`h-${i}`}>
                <line
                  x1="40"
                  y1={30 + i * 62.5}
                  x2="100%"
                  y2={30 + i * 62.5}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="35"
                  y={35 + i * 62.5}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="end"
                >
                  {(maxValue - (i / 4) * range).toFixed(1)}
                </text>
              </g>
            ))}
            
            {/* Вертикальные линии сетки (время) */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={`v-${i}`}>
                <line
                  x1={50 + i * 150}
                  y1="30"
                  x2={50 + i * 150}
                  y2="280"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={50 + i * 150}
                  y="295"
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="middle"
                  transform={`rotate(-45 ${50 + i * 150} 295)`}
                >
                  {new Date(minTime + (i / 4) * timeRange).toLocaleString('ru-RU', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </text>
              </g>
            ))}

            {/* Лимиты */}
            {limits.min !== null && (
              <line
                x1="50"
                y1={280 - ((limits.min - minValue) / range) * 250}
                x2="100%"
                y2={280 - ((limits.min - minValue) / range) * 250}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {limits.max !== null && (
              <line
                x1="50"
                y1={280 - ((limits.max - minValue) / range) * 250}
                x2="100%"
                y2={280 - ((limits.max - minValue) / range) * 250}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Данные */}
            {data.length > 1 && (
              <polyline
                points={data.map((d, i) => {
                  const x = 50 + ((d.timestamp - minTime) / timeRange) * 650;
                  const value = d[valueKey] as number;
                  const y = 280 - ((value - minValue) / range) * 250;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
            )}

            {/* Вертикальные линии */}
            {lines.map(line => (
              <g key={line.id}>
                <line
                  x1="50"
                  y1={280 - ((line.value - minValue) / range) * 250}
                  x2="700"
                  y2={280 - ((line.value - minValue) / range) * 250}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
                <line
                  x1="50"
                  y1={280 - ((line.value - minValue) / range) * 250}
                  x2="700"
                  y2={280 - ((line.value - minValue) / range) * 250}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />
                <circle
                  cx="60"
                  cy={280 - ((line.value - minValue) / range) * 250}
                  r="4"
                  fill="#8b5cf6"
                  className="cursor-pointer"
                  onClick={() => removeVerticalLine(line.id, chartType)}
                  title="Нажмите для удаления"
                />
                <circle
                  cx="690"
                  cy={280 - ((line.value - minValue) / range) * 250}
                  r="4"
                  fill="#8b5cf6"
                  className="cursor-pointer"
                  onClick={() => removeVerticalLine(line.id, chartType)}
                  title="Нажмите для удаления"
                />
              </g>
            ))}

            {/* Подписи осей */}
            <text x="25" y="160" fill="#6b7280" fontSize="12" textAnchor="middle" transform="rotate(-90 25 160)">
              {title} ({unit})
            </text>
            <text x="375" y="315" fill="#6b7280" fontSize="12" textAnchor="middle">
              Время
            </text>
          </svg>

          {/* Комментарии к линиям */}
          {lines.map(line => (
            <div
              key={`comment-${line.id}`}
              className="absolute left-16"
              style={{ top: 280 - ((line.value - minValue) / range) * 250 - 15 }}
            >
              {editingComment?.lineId === line.id && editingComment?.chartType === chartType ? (
                <input
                  type="text"
                  value={line.comment}
                  onChange={(e) => updateLineComment(line.id, chartType, e.target.value)}
                  onBlur={() => setEditingComment(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingComment(null)}
                  className="w-32 px-2 py-1 text-xs border border-purple-300 rounded bg-white shadow-sm"
                  autoFocus
                />
              ) : (
                <div
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer max-w-32 truncate shadow-sm"
                  onClick={() => setEditingComment({ lineId: line.id, chartType })}
                  title={line.comment || 'Нажмите для добавления комментария'}
                >
                  {line.comment || `${line.value.toFixed(1)}${unit}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Информация о масштабе */}
        {zoom && (
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
            Масштаб: {zoom.min.toFixed(1)} - {zoom.max.toFixed(1)} {unit}
          </div>
        )}

        {/* Временные периоды */}
        {lines.length >= 2 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Интервалы значений:</h4>
            {calculateTimePeriods(lines).map((period, index) => (
              <div key={index} className="text-xs bg-blue-50 p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <Target className="w-3 h-3 text-blue-600" />
                  <span className="font-medium">Интервал {index + 1}:</span>
                </div>
                <div className="mt-1 space-y-1">
                  <div>Начальное значение: {period.start}{unit} {period.startComment && `(${period.startComment})`}</div>
                  <div>Конечное значение: {period.end}{unit} {period.endComment && `(${period.endComment})`}</div>
                  <div className="font-medium text-blue-700">Разность: {period.difference}{unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTimeChart = (
    data: ChartData[],
    valueKey: 'temperature' | 'humidity',
    limits: Limits,
    lines: VerticalLine[],
    chartType: 'temperature' | 'humidity',
    title: string,
    unit: string,
    color: string,
    zoom: { min: number; max: number } | null
  ) => {
    if (data.length === 0) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      );
    }

    // Получаем временные значения
    const timeValues = data.map(d => d.timestamp);
    const allMinTime = Math.min(...timeValues);
    const allMaxTime = Math.max(...timeValues);
    
    // Используем зум если установлен, иначе полный диапазон времени
    const minTime = zoom?.min ?? allMinTime;
    const maxTime = zoom?.max ?? allMaxTime;
    const timeRange = maxTime - minTime;
    
    // Получаем значения для оси X (температура/влажность)
    const values = data.map(d => d[valueKey]).filter(v => v !== undefined) as number[];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;
    const padding = valueRange * 0.1;

    return (
      <div className="relative">
        {/* Кнопки управления */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            {zoom && (
              <button
                onClick={() => resetZoom(chartType)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Сбросить масштаб
              </button>
            )}
            <div className="text-xs text-gray-500">
              Выделите область для масштабирования • Двойной клик для добавления линии
            </div>
          </div>
        </div>
        
        <div
          ref={chartType === 'temperature' ? temperatureChartRef : humidityChartRef}
          className="h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden"
          onDoubleClick={(e) => handleChartDoubleClick(e, chartType)}
          onMouseDown={(e) => handleChartMouseDown(e, chartType)}
          onMouseUp={(e) => handleChartMouseUp(e, chartType)}
          title="Двойной клик для добавления горизонтальной линии • Выделите область для масштабирования"
        >
          {/* Область выделения для зума */}
          {isSelecting && isSelecting.chartType === chartType && (
            <div
              className="absolute bg-blue-200 bg-opacity-30 border border-blue-400 pointer-events-none"
              style={{
                left: 60,
                right: 60,
                top: Math.min(isSelecting.startY, isSelecting.startY),
                height: Math.abs(isSelecting.startY - isSelecting.startY) || 1
              }}
            />
          )}
          
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Горизонтальные линии сетки (время) */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <g key={`h-${i}`}>
                <line
                  x1="60"
                  y1={30 + i * 42}
                  x2="100%"
                  y2={30 + i * 42}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="55"
                  y={35 + i * 42}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="end"
                >
                  {new Date(maxTime - (i / 5) * timeRange).toLocaleString('ru-RU', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </text>
              </g>
            ))}
            
            {/* Вертикальные линии сетки (значения) */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={`v-${i}`}>
                <line
                  x1={60 + i * 150}
                  y1="30"
                  x2={60 + i * 150}
                  y2="280"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={60 + i * 150}
                  y="295"
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {(minValue - padding + (i / 4) * (valueRange + 2 * padding)).toFixed(1)}
                </text>
              </g>
            ))}

            {/* Лимиты */}
            {limits.min !== null && (
              <line
                x1={60 + ((limits.min - minValue + padding) / (valueRange + 2 * padding)) * 600}
                y1="30"
                x2={60 + ((limits.min - minValue + padding) / (valueRange + 2 * padding)) * 600}
                y2="280"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {limits.max !== null && (
              <line
                x1={60 + ((limits.max - minValue + padding) / (valueRange + 2 * padding)) * 600}
                y1="30"
                x2={60 + ((limits.max - minValue + padding) / (valueRange + 2 * padding)) * 600}
                y2="280"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Данные */}
            {data.length > 1 && (
              <polyline
                points={data.map((d) => {
                  const value = d[valueKey] as number;
                  const x = 60 + ((value - minValue + padding) / (valueRange + 2 * padding)) * 600;
                  const y = 280 - ((d.timestamp - minTime) / timeRange) * 250;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
            )}

            {/* Горизонтальные линии значений */}
            {lines.map(line => (
              <g key={line.id}>
                <line
                  x1={60 + ((line.value - minValue + padding) / (valueRange + 2 * padding)) * 600}
                  y1="30"
                  x2={60 + ((line.value - minValue + padding) / (valueRange + 2 * padding)) * 600}
                  y2="280"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />
                <circle
                  cx={60 + ((line.value - minValue + padding) / (valueRange + 2 * padding)) * 600}
                  cy="40"
                  r="4"
                  fill="#8b5cf6"
                  className="cursor-pointer"
                  onClick={() => removeVerticalLine(line.id, chartType)}
                  title="Нажмите для удаления"
                />
                <circle
                  cx={60 + ((line.value - minValue + padding) / (valueRange + 2 * padding)) * 600}
                  cy="270"
                  r="4"
                  fill="#8b5cf6"
                  className="cursor-pointer"
                  onClick={() => removeVerticalLine(line.id, chartType)}
                  title="Нажмите для удаления"
                />
              </g>
            ))}

            {/* Подписи осей */}
            <text x="25" y="160" fill="#6b7280" fontSize="12" textAnchor="middle" transform="rotate(-90 25 160)">
              Время
            </text>
            <text x="375" y="315" fill="#6b7280" fontSize="12" textAnchor="middle">
              {title} ({unit})
            </text>
          </svg>

          {/* Комментарии к линиям */}
          {lines.map(line => (
            <div
              key={`comment-${line.id}`}
              className="absolute top-2"
              style={{ left: 60 + ((line.value - minValue + padding) / (valueRange + 2 * padding)) * 600 - 25 }}
            >
              {editingComment?.lineId === line.id && editingComment?.chartType === chartType ? (
                <input
                  type="text"
                  value={line.comment}
                  onChange={(e) => updateLineComment(line.id, chartType, e.target.value)}
                  onBlur={() => setEditingComment(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingComment(null)}
                  className="w-32 px-2 py-1 text-xs border border-purple-300 rounded bg-white shadow-sm"
                  autoFocus
                />
              ) : (
                <div
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer max-w-32 truncate shadow-sm"
                  onClick={() => setEditingComment({ lineId: line.id, chartType })}
                  title={line.comment || 'Нажмите для добавления комментария'}
                >
                  {line.comment || `${line.value.toFixed(1)}${unit}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Информация о масштабе */}
        {zoom && (
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
            Временной масштаб: {new Date(zoom.min).toLocaleString('ru-RU')} - {new Date(zoom.max).toLocaleString('ru-RU')}
          </div>
        )}

        {/* Интервалы значений */}
        {lines.length >= 2 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Интервалы значений:</h4>
            {calculateTimePeriods(lines).map((period, index) => (
              <div key={index} className="text-xs bg-blue-50 p-2 rounded border">
                <div className="flex items-center space-x-2">
                  <Target className="w-3 h-3 text-blue-600" />
                  <span className="font-medium">Интервал {index + 1}:</span>
                </div>
                <div className="mt-1 space-y-1">
                  <div>Начальное значение: {period.start}{unit} {period.startComment && `(${period.startComment})`}</div>
                  <div>Конечное значение: {period.end}{unit} {period.endComment && `(${period.endComment})`}</div>
                  <div className="font-medium text-blue-700">Разность: {period.difference}{unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const isFormValid = () => {
    return researchInfo.reportNumber && 
           researchInfo.reportDate && 
           researchInfo.templateFile && 
           researchInfo.objectName;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Визуализация данных</h1>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к загрузке</span>
        </button>
      </div>

      {/* Информация для исследования */}
      <div ref={researchInfoRef} className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Информация для исследования</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              № отчета <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={researchInfo.reportNumber}
              onChange={(e) => setResearchInfo(prev => ({ ...prev, reportNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите номер отчета"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата отчета <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={researchInfo.reportDate}
                onChange={(e) => setResearchInfo(prev => ({ ...prev, reportDate: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон выходной формы отчета <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".docx"
              onChange={handleTemplateUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            {researchInfo.templateFile && (
              <p className="text-sm text-green-600 mt-1">Загружен: {researchInfo.templateFile.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название объекта исследования <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={researchInfo.objectName}
                onChange={(e) => setResearchInfo(prev => ({ ...prev, objectName: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите название объекта"
                required
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название климатической установки
            </label>
            <div className="relative">
              <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={researchInfo.climateSystemName}
                onChange={(e) => setResearchInfo(prev => ({ ...prev, climateSystemName: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите название климатической установки"
              />
            </div>
          </div>
        </div>

        {!isFormValid() && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Пожалуйста, заполните все обязательные поля (отмечены *)
            </p>
          </div>
        )}
      </div>

      {/* Исследовательский режим */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Target className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Исследовательский режим</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Лимиты температуры (°C)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.1"
                value={temperatureLimits.min || ''}
                onChange={(e) => setTemperatureLimits(prev => ({ ...prev, min: e.target.value ? parseFloat(e.target.value) : null }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Мин"
              />
              <input
                type="number"
                step="0.1"
                value={temperatureLimits.max || ''}
                onChange={(e) => setTemperatureLimits(prev => ({ ...prev, max: e.target.value ? parseFloat(e.target.value) : null }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Макс"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Лимиты влажности (%)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.1"
                value={humidityLimits.min || ''}
                onChange={(e) => setHumidityLimits(prev => ({ ...prev, min: e.target.value ? parseFloat(e.target.value) : null }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Мин"
              />
              <input
                type="number"
                step="0.1"
                value={humidityLimits.max || ''}
                onChange={(e) => setHumidityLimits(prev => ({ ...prev, max: e.target.value ? parseFloat(e.target.value) : null }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Макс"
              />
            </div>
          </div>
        </div>

        {/* Графики */}
        <div className="space-y-8">
          {/* График температуры */}
          <div>
            {renderTimeChart(
              chartData,
              'temperature',
              temperatureLimits,
              temperatureLines,
              'temperature',
              'Температура',
              '°C',
              '#ef4444',
              temperatureZoom
            )}
          </div>

          {/* График влажности */}
          {chartData.some(d => d.humidity !== undefined) && (
            <div>
              {renderTimeChart(
                chartData,
                'humidity',
                humidityLimits,
                humidityLines,
                'humidity',
                'Влажность',
                '%',
                '#3b82f6',
                humidityZoom
              )}
            </div>
          )}
        </div>

        {/* Информация о данных */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Информация о загруженных данных:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Количество файлов:</span> {files.filter(f => f.parsingStatus === 'completed').length}
            </div>
            <div>
              <span className="font-medium">Общее количество записей:</span> {chartData.length.toLocaleString('ru-RU')}
            </div>
            <div>
              <span className="font-medium">Период данных:</span> 
              {chartData.length > 0 && (
                <span className="ml-1">
                  {new Date(chartData[0].timestamp).toLocaleDateString('ru-RU')} - 
                  {new Date(chartData[chartData.length - 1].timestamp).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Кнопка генерации отчета */}
        <div className="mt-6 flex justify-end">
          <button
            disabled={!isFormValid()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Сформировать отчет</span>
          </button>
        </div>
      </div>
    </div>
  );
};