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
    
    // Инициализируем зум на полный диапазон
    if (allData.length > 0) {
      setTemperatureZoom({ startIndex: 0, endIndex: allData.length - 1, isZoomed: false });
      setHumidityZoom({ startIndex: 0, endIndex: allData.length - 1, isZoomed: false });
    }
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
    const x = event.clientX - rect.left;
    const chartWidth = rect.width - 120; // Учитываем отступы для оси времени
    
    const zoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const visibleData = chartData.slice(zoom.startIndex, zoom.endIndex + 1);
    const dataWidth = visibleData.length > 0 ? visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp : 0;
    
    if (dataWidth === 0) return;
    
    const timestamp = visibleData[0].timestamp + (x - 60) / chartWidth * dataWidth;
    
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

  const handleZoomIn = (chartType: 'temperature' | 'humidity') => {
    const zoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const setZoom = chartType === 'temperature' ? setTemperatureZoom : setHumidityZoom;
    
    const currentRange = zoom.endIndex - zoom.startIndex;
    const newRange = Math.max(Math.floor(currentRange * 0.5), 10); // Минимум 10 точек
    const center = Math.floor((zoom.startIndex + zoom.endIndex) / 2);
    
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);
    
    setZoom({ startIndex: newStart, endIndex: newEnd, isZoomed: true });
  };

  const handleZoomOut = (chartType: 'temperature' | 'humidity') => {
    const zoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const setZoom = chartType === 'temperature' ? setTemperatureZoom : setHumidityZoom;
    
    const currentRange = zoom.endIndex - zoom.startIndex;
    const newRange = Math.min(currentRange * 2, chartData.length);
    const center = Math.floor((zoom.startIndex + zoom.endIndex) / 2);
    
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, newStart + newRange);
    
    setZoom({ startIndex: newStart, endIndex: newEnd, isZoomed: newRange < chartData.length });
  };

  const handleZoomReset = (chartType: 'temperature' | 'humidity') => {
    const setZoom = chartType === 'temperature' ? setTemperatureZoom : setHumidityZoom;
    setZoom({ startIndex: 0, endIndex: chartData.length - 1, isZoomed: false });
  };

  const handlePanLeft = (chartType: 'temperature' | 'humidity') => {
    const zoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const setZoom = chartType === 'temperature' ? setTemperatureZoom : setHumidityZoom;
    
    const range = zoom.endIndex - zoom.startIndex;
    const step = Math.max(1, Math.floor(range * 0.1));
    
    if (zoom.startIndex > 0) {
      const newStart = Math.max(0, zoom.startIndex - step);
      const newEnd = newStart + range;
      setZoom({ ...zoom, startIndex: newStart, endIndex: newEnd });
    }
  };

  const handlePanRight = (chartType: 'temperature' | 'humidity') => {
    const zoom = chartType === 'temperature' ? temperatureZoom : humidityZoom;
    const setZoom = chartType === 'temperature' ? setTemperatureZoom : setHumidityZoom;
    
    const range = zoom.endIndex - zoom.startIndex;
    const step = Math.max(1, Math.floor(range * 0.1));
    
    if (zoom.endIndex < chartData.length - 1) {
      const newEnd = Math.min(chartData.length - 1, zoom.endIndex + step);
      const newStart = newEnd - range;
      setZoom({ ...zoom, startIndex: newStart, endIndex: newEnd });
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

  const renderChart = (
    data: ChartData[],
    valueKey: 'temperature' | 'humidity',
    limits: Limits,
    lines: VerticalLine[],
    chartType: 'temperature' | 'humidity',
    title: string,
    unit: string,
    color: string,
    zoom: ZoomState
  ) => {
    if (data.length === 0) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      );
    }

    // Получаем видимые данные согласно зуму
    const visibleData = data.slice(zoom.startIndex, zoom.endIndex + 1);
    const values = visibleData.map(d => d[valueKey]).filter(v => v !== undefined) as number[];
    
    if (values.length === 0) {
      return (
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения в выбранном диапазоне</p>
        </div>
      );
    }

    const minValue = Math.min(...values, limits.min || Infinity);
    const maxValue = Math.max(...values, limits.max || -Infinity);
    const range = maxValue - minValue;
    const padding = range * 0.1;

    // Временные метки для оси X
    const timeLabels = [];
    const labelCount = 6;
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor(i * (visibleData.length - 1) / (labelCount - 1));
      if (index < visibleData.length) {
        timeLabels.push({
          x: 60 + (i / (labelCount - 1)) * (100 - 12), // Процентное позиционирование
          time: new Date(visibleData[index].timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    }

    // Значения для оси Y
    const valueLabels = [];
    const valueCount = 5;
    for (let i = 0; i < valueCount; i++) {
      const value = minValue - padding + (i / (valueCount - 1)) * (range + 2 * padding);
      valueLabels.push({
        y: 280 - (i / (valueCount - 1)) * 260,
        value: value.toFixed(1)
      });
    }

    return (
      <div className="relative">
        {/* Элементы управления зумом */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <button
              onClick={() => handleZoomIn(chartType)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Увеличить
            </button>
            <button
              onClick={() => handleZoomOut(chartType)}
              disabled={!zoom.isZoomed}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
            >
              Уменьшить
            </button>
            <button
              onClick={() => handleZoomReset(chartType)}
              disabled={!zoom.isZoomed}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            >
              Сбросить
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePanLeft(chartType)}
              disabled={zoom.startIndex === 0}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
            >
              ← Влево
            </button>
            <button
              onClick={() => handlePanRight(chartType)}
              disabled={zoom.endIndex === data.length - 1}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
            >
              Вправо →
            </button>
          </div>
        </div>

        <div
          ref={chartType === 'temperature' ? temperatureChartRef : humidityChartRef}
          className="h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden"
          onDoubleClick={(e) => handleChartDoubleClick(e, chartType)}
          title="Двойной клик для добавления вертикальной линии"
        >
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 384">
            {/* Горизонтальные линии сетки */}
            {valueLabels.map((label, i) => (
              <line
                key={`h-${i}`}
                x1="60"
                y1={label.y}
                x2="740"
                y2={label.y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Вертикальные линии сетки */}
            {timeLabels.map((label, i) => (
              <line
                key={`v-${i}`}
                x1={60 + (i / (timeLabels.length - 1)) * 680}
                y1="20"
                x2={60 + (i / (timeLabels.length - 1)) * 680}
                y2="340"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}

            {/* Подписи оси Y (значения) */}
            {valueLabels.map((label, i) => (
              <text
                key={`y-label-${i}`}
                x="50"
                y={label.y + 4}
                fill="#6b7280"
                fontSize="10"
                textAnchor="end"
              >
                {label.value}
              </text>
            ))}

            {/* Подписи оси X (время) */}
            {timeLabels.map((label, i) => (
              <text
                key={`x-label-${i}`}
                x={60 + (i / (timeLabels.length - 1)) * 680}
                y="360"
                fill="#6b7280"
                fontSize="9"
                textAnchor="middle"
              >
                {label.time}
              </text>
            ))}

            {/* Лимиты */}
            {limits.min !== null && (
              <line
                x1="60"
                y1={340 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 320}
                x2="740"
                y2={340 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 320}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {limits.max !== null && (
              <line
                x1="60"
                y1={340 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 320}
                x2="740"
                y2={340 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 320}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Данные */}
            {visibleData.length > 1 && (
              <polyline
                points={visibleData.map((d, i) => {
                  const x = 60 + (i / (visibleData.length - 1)) * 680;
                  const value = d[valueKey] as number;
                  const y = 340 - ((value - minValue + padding) / (range + 2 * padding)) * 320;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
            )}

            {/* Вертикальные линии */}
            {lines
              .filter(line => {
                // Показываем только линии в видимом диапазоне
                return line.timestamp >= visibleData[0]?.timestamp && 
                       line.timestamp <= visibleData[visibleData.length - 1]?.timestamp;
              })
              .map(line => {
                // Пересчитываем позицию линии для текущего зума
                const relativeTimestamp = line.timestamp - visibleData[0].timestamp;
                const totalTimeRange = visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp;
                const xPosition = 60 + (relativeTimestamp / totalTimeRange) * 680;
                
                return (
                  <g key={line.id}>
                    <line
                      x1={xPosition}
                      y1="20"
                      x2={xPosition}
                      y2="340"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    />
                    <circle
                      cx={xPosition}
                      cy="30"
                      r="6"
                      fill="#8b5cf6"
                      className="cursor-pointer hover:fill-red-500"
                      onClick={() => removeVerticalLine(line.id, chartType)}
                      title="Нажмите для удаления линии"
                    />
                    <text
                      x={xPosition}
                      y="15"
                      fill="#8b5cf6"
                      fontSize="10"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      ×
                    </text>
                  </g>
                );
              })}

            {/* Подписи осей */}
            <text x="25" y="180" fill="#6b7280" fontSize="12" textAnchor="middle" transform="rotate(-90 25 180)">
              {title} ({unit})
            </text>
            <text x="400" y="380" fill="#6b7280" fontSize="12" textAnchor="middle">
              Время
            </text>
          </svg>

          {/* Комментарии к линиям */}
          {lines
            .filter(line => {
              return line.timestamp >= visibleData[0]?.timestamp && 
                     line.timestamp <= visibleData[visibleData.length - 1]?.timestamp;
            })
            .map(line => {
              const relativeTimestamp = line.timestamp - visibleData[0].timestamp;
              const totalTimeRange = visibleData[visibleData.length - 1].timestamp - visibleData[0].timestamp;
              const xPosition = 60 + (relativeTimestamp / totalTimeRange) * 680;
              
              return (
                <div
                  key={`comment-${line.id}`}
                  className="absolute top-12"
                  style={{ left: `${(xPosition / 800) * 100}%`, transform: 'translateX(-50%)' }}
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
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer max-w-32 truncate shadow-sm border border-purple-200"
                      onClick={() => setEditingComment({ lineId: line.id, chartType })}
                      title={line.comment || 'Нажмите для добавления комментария'}
                    >
                      {line.comment || 'Комментарий'}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Информация о зуме */}
        {zoom.isZoomed && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded">
            Показано: {zoom.endIndex - zoom.startIndex + 1} из {data.length} записей
            ({new Date(visibleData[0]?.timestamp).toLocaleString('ru-RU')} - 
             {new Date(visibleData[visibleData.length - 1]?.timestamp).toLocaleString('ru-RU')})
          </div>
        )}

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
              Двойной клик для добавления вертикальной линии. Клик по кружку с крестиком для удаления линии.
            </p>
            {renderChart(
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">График влажности</h3>
              <p className="text-sm text-gray-600 mb-4">
                Двойной клик для добавления вертикальной линии. Клик по кружку с крестиком для удаления линии.
              </p>
              {renderChart(
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