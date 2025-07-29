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
  const [temperatureZoom, setTemperatureZoom] = useState<ZoomState>({ startIndex: 0, endIndex: -1 });
  const [humidityZoom, setHumidityZoom] = useState<ZoomState>({ startIndex: 0, endIndex: -1 });
  const [isSelecting, setIsSelecting] = useState<{ chartType: 'temperature' | 'humidity'; startX: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; endX: number; chartType: 'temperature' | 'humidity' } | null>(null);

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
    const x = event.clientX - rect.left;
    const chartWidth = rect.width - 80; // Учитываем отступы
    const dataWidth = chartData.length > 0 ? chartData[chartData.length - 1].timestamp - chartData[0].timestamp : 0;
    
    if (dataWidth === 0) return;
    
    const timestamp = chartData[0].timestamp + (x - 40) / chartWidth * dataWidth;
    
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

  const handleMouseDown = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (event.detail === 2) return; // Ignore if it's part of a double-click
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    setIsSelecting({ chartType, startX: x });
    setSelectionBox(null);
  };

  const handleMouseMove = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (!isSelecting || isSelecting.chartType !== chartType) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    setSelectionBox({
      startX: Math.min(isSelecting.startX, x),
      endX: Math.max(isSelecting.startX, x),
      chartType
    });
  };

  const handleMouseUp = (event: React.MouseEvent, chartType: 'temperature' | 'humidity') => {
    if (!isSelecting || isSelecting.chartType !== chartType || !selectionBox) {
      setIsSelecting(null);
      setSelectionBox(null);
      return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const chartWidth = rect.width - 80; // Account for margins
    
    if (Math.abs(selectionBox.endX - selectionBox.startX) < 10) {
      // Too small selection, ignore
      setIsSelecting(null);
      setSelectionBox(null);
      return;
    }
    
    // Calculate zoom indices
    const startRatio = (selectionBox.startX - 40) / chartWidth;
    const endRatio = (selectionBox.endX - 40) / chartWidth;
    
    const dataLength = chartData.length;
    const startIndex = Math.max(0, Math.floor(startRatio * dataLength));
    const endIndex = Math.min(dataLength - 1, Math.ceil(endRatio * dataLength));
    
    if (chartType === 'temperature') {
      setTemperatureZoom({ startIndex, endIndex });
    } else {
      setHumidityZoom({ startIndex, endIndex });
    }
    
    setIsSelecting(null);
    setSelectionBox(null);
  };

  const resetZoom = (chartType: 'temperature' | 'humidity') => {
    if (chartType === 'temperature') {
      setTemperatureZoom({ startIndex: 0, endIndex: -1 });
    } else {
      setHumidityZoom({ startIndex: 0, endIndex: -1 });
    }
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

    // Apply zoom
    const startIndex = zoom.startIndex;
    const endIndex = zoom.endIndex === -1 ? data.length - 1 : zoom.endIndex;
    const zoomedData = data.slice(startIndex, endIndex + 1);
    
    const values = zoomedData.map(d => d[valueKey]).filter(v => v !== undefined) as number[];
    const minValue = Math.min(...values, limits.min || Infinity);
    const maxValue = Math.max(...values, limits.max || -Infinity);
    const range = maxValue - minValue;
    const padding = range * 0.1;

    // Calculate time labels
    const timeLabels = [];
    const labelCount = 6;
    for (let i = 0; i < labelCount; i++) {
      const dataIndex = Math.floor((i / (labelCount - 1)) * (zoomedData.length - 1));
      if (dataIndex < zoomedData.length) {
        const timestamp = zoomedData[dataIndex].timestamp;
        const date = new Date(timestamp);
        timeLabels.push({
          x: 40 + (i / (labelCount - 1)) * (100 - 40),
          label: date.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    }

    return (
      <div className="relative">
        {/* Zoom controls */}
        {(zoom.startIndex > 0 || zoom.endIndex !== -1) && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={() => resetZoom(chartType)}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
            >
              Сбросить масштаб
            </button>
          </div>
        )}
        
        <div
          ref={chartType === 'temperature' ? temperatureChartRef : humidityChartRef}
          className="h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-crosshair relative overflow-hidden select-none"
          onDoubleClick={(e) => handleChartDoubleClick(e, chartType)}
          onMouseDown={(e) => handleMouseDown(e, chartType)}
          onMouseMove={(e) => handleMouseMove(e, chartType)}
          onMouseUp={(e) => handleMouseUp(e, chartType)}
          title="Двойной клик для добавления вертикальной линии"
        >
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Горизонтальные линии сетки */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line
                key={`h-${i}`}
                x1="40"
                y1={60 + i * 50}
                x2="100%"
                y2={60 + i * 50}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Вертикальные линии сетки */}
            {timeLabels.map((label, i) => (
              <line
                key={`v-${i}`}
                x1={`${label.x}%`}
                y1="20"
                x2={`${label.x}%`}
                y2="320"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}

            {/* Подписи времени */}
            {timeLabels.map((label, i) => (
              <text
                key={`time-${i}`}
                x={`${label.x}%`}
                y="340"
                fill="#6b7280"
                fontSize="10"
                textAnchor="middle"
              >
                {label.label}
              </text>
            ))}

            {/* Подписи значений по Y */}
            {[0, 1, 2, 3, 4, 5].map(i => {
              const value = maxValue + padding - (i / 5) * (range + 2 * padding);
              return (
                <text
                  key={`y-${i}`}
                  x="35"
                  y={65 + i * 50}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="end"
                >
                  {value.toFixed(1)}
                </text>
              );
            })}

            {/* Лимиты */}
            {limits.min !== null && (
              <line
                x1="40"
                y1={320 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 300}
                x2="100%"
                y2={320 - ((limits.min - minValue + padding) / (range + 2 * padding)) * 300}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {limits.max !== null && (
              <line
                x1="40"
                y1={320 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 300}
                x2="100%"
                y2={320 - ((limits.max - minValue + padding) / (range + 2 * padding)) * 300}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Данные */}
            {zoomedData.length > 1 && (
              <polyline
                points={zoomedData.map((d, i) => {
                  const x = 40 + (i / (zoomedData.length - 1)) * (100 - 40);
                  const value = d[valueKey] as number;
                  const y = 320 - ((value - minValue + padding) / (range + 2 * padding)) * 300;
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
                // Only show lines that are within the current zoom range
                const lineTimestamp = line.timestamp;
                const zoomStartTime = zoomedData[0]?.timestamp || 0;
                const zoomEndTime = zoomedData[zoomedData.length - 1]?.timestamp || 0;
                return lineTimestamp >= zoomStartTime && lineTimestamp <= zoomEndTime;
              })
              .map(line => {
                // Recalculate x position based on zoomed data
                const lineTimestamp = line.timestamp;
                const zoomStartTime = zoomedData[0]?.timestamp || 0;
                const zoomEndTime = zoomedData[zoomedData.length - 1]?.timestamp || 0;
                const timeRange = zoomEndTime - zoomStartTime;
                const relativePosition = timeRange > 0 ? (lineTimestamp - zoomStartTime) / timeRange : 0;
                const x = 40 + relativePosition * 60; // 60% of chart width
                
                return (
                  <g key={line.id}>
                    <line
                      x1={x}
                      y1="20"
                      x2={x}
                      y2="320"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x}
                      cy="310"
                      r="6"
                      fill="#8b5cf6"
                      className="cursor-pointer pointer-events-auto"
                      onClick={() => removeVerticalLine(line.id, chartType)}
                      title="Нажмите для удаления"
                    />
                  </g>
                );
              })}

            {/* Selection box */}
            {selectionBox && selectionBox.chartType === chartType && (
              <rect
                x={selectionBox.startX}
                y="20"
                width={selectionBox.endX - selectionBox.startX}
                height="300"
                fill="rgba(59, 130, 246, 0.2)"
                stroke="rgba(59, 130, 246, 0.5)"
                strokeWidth="1"
              />
            )}

            {/* Подписи осей */}
            <text x="20" y="170" fill="#6b7280" fontSize="12" textAnchor="middle" transform="rotate(-90 20 170)">
              {title} ({unit})
            </text>
            
            <text x="50%" y="370" fill="#6b7280" fontSize="12" textAnchor="middle">
              Время
            </text>
          </svg>

          {/* Комментарии к линиям */}
          {lines
            .filter(line => {
              const lineTimestamp = line.timestamp;
              const zoomStartTime = zoomedData[0]?.timestamp || 0;
              const zoomEndTime = zoomedData[zoomedData.length - 1]?.timestamp || 0;
              return lineTimestamp >= zoomStartTime && lineTimestamp <= zoomEndTime;
            })
            .map(line => {
              const lineTimestamp = line.timestamp;
              const zoomStartTime = zoomedData[0]?.timestamp || 0;
              const zoomEndTime = zoomedData[zoomedData.length - 1]?.timestamp || 0;
              const timeRange = zoomEndTime - zoomStartTime;
              const relativePosition = timeRange > 0 ? (lineTimestamp - zoomStartTime) / timeRange : 0;
              const x = 40 + relativePosition * 60; // 60% of chart width
              
              return (
                <div
                  key={`comment-${line.id}`}
                  className="absolute top-2 pointer-events-auto"
                  style={{ left: x - 50 }}
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
              );
            })}
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
              Двойной клик для добавления вертикальной линии. Выделите область мышью для масштабирования. Клик по кружку внизу для удаления линии.
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
                Двойной клик для добавления вертикальной линии. Выделите область мышью для масштабирования. Клик по кружку внизу для удаления линии.
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