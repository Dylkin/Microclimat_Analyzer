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
  timestamp: number;
  comment: string;
  x: number;
}

interface ZoomState {
  startIndex: number;
  endIndex: number;
  isZoomed: boolean;
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
  const [temperatureZoom, setTemperatureZoom] = useState<ZoomState>({ startIndex: 0, endIndex: 0, isZoomed: false });
  const [humidityZoom, setHumidityZoom] = useState<ZoomState>({ startIndex: 0, endIndex: 0, isZoomed: false });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; chartType: 'temperature' | 'humidity' } | null>(null);

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
    
    // Сбрасываем зум при загрузке новых данных
    setTemperatureZoom({ startIndex: 0, endIndex: allData.length - 1, isZoomed: false });
    setHumidityZoom({ startIndex: 0, endIndex: allData.length - 1, isZoomed: false });
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
    // Предотвращаем добавление линии во время перетаскивания
    if (isDragging) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const chartWidth = rect.width - 60; // 40px слева + 20px справа
    
    const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const visibleData = getVisibleData(chartType);
    
    if (visibleData.length === 0) return;
    
    const dataWidth = visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp;
    
    if (dataWidth === 0) return;
    
    const timestamp = visibleData[0].timestamp + (x - 40) / chartWidth * dataWidth;
    
    const newLine: VerticalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp,
      comment: '',
      x
    };

    if (chartType === 'temperature') {
      setTemperatureLines(prev => [...prev, newLine]);
    } else {
      setHumidityLines(prev => [...prev, newLine]);
    }

    setEditingComment({ lineId: newLine.id, chartType });
  };

  const handleMouseDown = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (event.detail === 2) return; // Игнорируем двойной клик
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    setIsDragging(true);
    setDragStart({ x, chartType });
  };

  const handleMouseMove = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (!isDragging || !dragStart || dragStart.chartType !== chartType) return;
    
    // Визуальная обратная связь при перетаскивании можно добавить здесь
  };

  const handleMouseUp = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (!isDragging || !dragStart || dragStart.chartType !== chartType) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const startX = dragStart.x;
    
    // Минимальная ширина выделения для зума
    if (Math.abs(endX - startX) > 20) {
      const chartWidth = rect.width - 60; // 40px слева + 20px справа
      const visibleData = getVisibleData(chartType);
      
      if (visibleData.length > 0) {
        const startRatio = Math.max(0, Math.min(1, (Math.min(startX, endX) - 40) / chartWidth));
        const endRatio = Math.max(0, Math.min(1, (Math.max(startX, endX) - 40) / chartWidth));
        
        const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
        const dataRange = currentZoom.endIndex - currentZoom.startIndex;
        
        const newStartIndex = Math.floor(currentZoom.startIndex + startRatio * dataRange);
        const newEndIndex = Math.ceil(currentZoom.startIndex + endRatio * dataRange);
        
        const newZoom: ZoomState = {
          startIndex: newStartIndex,
          endIndex: newEndIndex,
          isZoomed: true
        };
        
        if (chartType === 'temperature') {
          setTemperatureZoom(newZoom);
        } else {
          setHumidityZoom(newZoom);
        }
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
  };

  const resetZoom = (chartType: 'temperature' | 'humidity') => {
    const resetState: ZoomState = {
      startIndex: 0,
      endIndex: chartData.length - 1,
      isZoomed: false
    };
    
    if (chartType === 'temperature') {
      setTemperatureZoom(resetState);
    } else {
      setHumidityZoom(resetState);
    }
  };

  const getVisibleData = (chartType: 'temperature' | 'humidity') => {
    const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    return chartData.slice(currentZoom.startIndex, currentZoom.endIndex + 1);
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

  const formatAxisDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChart = (
    data: ChartData[],
    valueKey: 'temperature' | 'humidity',
    limits: Limits,
    lines: VerticalLine[],
    chartType: 'temperature' | 'humidity',
    title: string,
    unit: string,
    color: string
  ) => {
    const visibleData = getVisibleData(chartType);
    const currentZoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    
    if (visibleData.length === 0) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      );
    }

    const values = visibleData.map(d => d[valueKey]).filter(v => v !== undefined) as number[];
    const minValue = Math.min(...values, limits.min || Infinity);
    const maxValue = Math.max(...values, limits.max || -Infinity);
    const range = maxValue - minValue;
    const padding = range * 0.1;

    // Вычисляем позиции для временных меток
    const timeLabels = [];
    const labelCount = 6;
    for (let i = 0; i < labelCount; i++) {
      const dataIndex = Math.floor(i * (visibleData.length - 1) / (labelCount - 1));
      const timestamp = visibleData[dataIndex]?.timestamp;
      if (timestamp) {
        timeLabels.push({
          x: 40 + (i / (labelCount - 1)) * 60,
          label: formatAxisDate(timestamp)
        });
      }
    }

    return (
      <div className="relative">
        {/* Кнопки управления масштабом */}
        <div className="flex justify-end mb-2 space-x-2">
          {currentZoom.isZoomed && (
            <button
              onClick={() => resetZoom(chartType)}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              Сбросить масштаб
            </button>
          )}
          <div className="text-xs text-gray-500">
            Перетащите мышью для увеличения области
          </div>
        </div>
        
        <div
          ref={chartType === 'temperature' ? temperatureChartRef : humidityChartRef}
          className="h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden select-none"
          onDoubleClick={(e) => handleChartDoubleClick(e, chartType)}
          onMouseDown={(e) => handleMouseDown(e, chartType)}
          onMouseMove={(e) => handleMouseMove(e, chartType)}
          onMouseUp={(e) => handleMouseUp(e, chartType)}
          title="Двойной клик для добавления вертикальной линии"
        >
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Горизонтальные линии сетки */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`h-${i}`}
                x1="40"
                y1={60 + i * 55}
                x2="calc(100% - 20px)"
                y2={60 + i * 55}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Вертикальные линии сетки */}
            {timeLabels.map((label, i) => (
              <line
                key={`v-${i}`} 
                x1={label.x}
                y1="20"
                x2={label.x}
                y2="280"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}

            {/* Подписи временной оси */}
            {timeLabels.map((label, i) => (
              <text
                key={`time-${i}`}
                x={label.x}
                y="300"
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {label.label}
              </text>
            ))}

            {/* Подписи значений по Y */}
            {[0, 1, 2, 3, 4].map(i => {
              const value = maxValue - (i / 4) * range;
              return (
                <text
                  key={`y-${i}`}
                  x="35"
                  y={65 + i * 55}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="end"
                  className="pointer-events-none"
                >
                  {value.toFixed(1)}
                </text>
              );
            })}

            {/* Лимиты */}
            {limits.min !== null && (
              <line
                x1="40"
                y1={280 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 260}
                x2="calc(100% - 20px)"
                y2={280 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 260}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {limits.max !== null && (
              <line
                x1="40"
                y1={280 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 260}
                x2="calc(100% - 20px)"
                y2={280 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 260}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Данные */}
            {visibleData.length > 1 && (
              <polyline
                points={visibleData.map((d, i) => {
                  const x = 40 + (i / (visibleData.length - 1)) * (100 - 60);
                  const value = d[valueKey] as number;
                  const y = 280 - ((value - minValue + padding) / (range + 2 * padding)) * 260;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
            )}

            {/* Вертикальные линии */}
            {lines.map(line => {
              // Проверяем, попадает ли линия в видимый диапазон
              const isVisible = line.timestamp >= visibleData[0]?.timestamp && 
                               line.timestamp <= visibleData[visibleData.length - 1]?.timestamp;
              
              if (!isVisible) return null;
              
              // Вычисляем позицию линии относительно видимых данных
              const timeRange = visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp;
              const relativeTime = line.timestamp - visibleData[0].timestamp;
              const xPos = 40 + (relativeTime / timeRange) * (100 - 60);
              
              return (
                <g key={line.id}>
                  <line
                    x1={xPos}
                    y1="20"
                    x2={xPos}
                    y2="280"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  />
                  <circle
                    cx={xPos}
                    cy="30"
                    r="4"
                    fill="#8b5cf6"
                    className="cursor-pointer"
                    onClick={() => removeVerticalLine(line.id, chartType)}
                    title="Нажмите для удаления"
                  />
                </g>
              );
            })}

            {/* Подписи осей */}
            <text x="20" y="150" fill="#6b7280" fontSize="12" textAnchor="middle" transform="rotate(-90 20 150)">
              {title} ({unit})
            </text>
          </svg>

          {/* Комментарии к линиям */}
          {lines.map(line => (
            <div
              key={`comment-${line.id}`}
              className="absolute top-2"
              style={{ 
                left: (() => {
                  const isVisible = line.timestamp >= visibleData[0]?.timestamp && 
                                   line.timestamp <= visibleData[visibleData.length - 1]?.timestamp;
                  if (!isVisible) return '-1000px'; // Скрываем за пределами экрана
                  
                  const timeRange = visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp;
                  const relativeTime = line.timestamp - visibleData[0].timestamp;
                  const xPos = 40 + (relativeTime / timeRange) * (100 - 60);
                  return `calc(${xPos}px - 50px)`;
                })()
              }}
            >
              {editingComment?.lineId === line.id && editingComment?.chartType === chartType ? (
                <input
                  type="text"
                  value={line.comment}
                  onChange={(e) => updateLineComment(line.id, chartType, e.target.value)}
                  onBlur={() => setEditingComment(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingComment(null)}
                  className="w-24 px-1 py-0.5 text-xs border border-purple-300 rounded bg-white"
                  autoFocus
                />
              ) : (
                <div
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer max-w-24 truncate"
                  onClick={() => setEditingComment({ lineId: line.id, chartType })}
                  title={line.comment || 'Нажмите для добавления комментария'}
                >
                  {line.comment || 'Комментарий'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Временные периоды */}
        {lines.length >= 2 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Временные периоды:</h4>
            {calculateTimePeriods(lines).map((period, index) => (
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">График температуры</h3>
            <p className="text-sm text-gray-600 mb-4">
              Двойной клик для добавления вертикальной линии. Клик по кружку для удаления линии.
            </p>
            {renderChart(
              chartData,
              'temperature',
              temperatureLimits,
              temperatureLines,
              'temperature',
              'Температура',
              '°C',
              '#ef4444'
            )}
          </div>

          {/* График влажности */}
          {chartData.some(d => d.humidity !== undefined) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">График влажности</h3>
              <p className="text-sm text-gray-600 mb-4">
                Двойной клик для добавления вертикальной линии. Клик по кружку для удаления линии.
              </p>
              {renderChart(
                chartData,
                'humidity',
                humidityLimits,
                humidityLines,
                'humidity',
                'Влажность',
                '%',
                '#3b82f6'
              )}
            </div>
          )}
        </div>

        {/* Информация о данных */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Информация о загруженных данных:</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
            <div>
              <span className="font-medium">Масштаб:</span> 
              <span className="ml-1">
                {temperatureZoom.isZoomed || humidityZoom.isZoomed ? 'Увеличен' : 'Полный'}
              </span>
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