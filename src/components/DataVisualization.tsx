import React, { useState, useRef, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Brush,
  ReferenceLine,
  Legend
} from 'recharts';
import { BarChart, FileText, Calendar, Building, Settings, Target, Clock, MessageSquare, Download, ArrowLeft, Plus, X } from 'lucide-react';
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

interface VerticalMarker {
  id: string;
  timestamp: number;
  comment: string;
  color: string;
}

interface ChartDataPoint {
  timestamp: number;
  timestampFormatted: string;
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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [temperatureMarkers, setTemperatureMarkers] = useState<VerticalMarker[]>([]);
  const [humidityMarkers, setHumidityMarkers] = useState<VerticalMarker[]>([]);
  const [editingMarker, setEditingMarker] = useState<{ markerId: string; chartType: 'temperature' | 'humidity' } | null>(null);
  const [newMarkerComment, setNewMarkerComment] = useState('');

  const researchInfoRef = useRef<HTMLDivElement>(null);

  const testTypes = [
    { value: 'empty-object', label: 'Соответствие критериям в пустом объекте' },
    { value: 'loaded-object', label: 'Соответствие критериям в загруженном объекте' },
    { value: 'door-opening', label: 'Открытие двери' },
    { value: 'power-off', label: 'Отключение электропитания' },
    { value: 'power-on', label: 'Включение электропитания' }
  ];

  const markerColors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadChartData();
    // Автоматический фокус на блок информации для исследования
    setTimeout(() => {
      researchInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [files]);

  const loadChartData = async () => {
    const allData: ChartDataPoint[] = [];
    
    for (const file of files.filter(f => f.parsingStatus === 'completed')) {
      try {
        const measurements = await databaseService.getMeasurements(file.id);
        if (measurements) {
          const fileData = measurements.map(m => ({
            timestamp: m.timestamp.getTime(),
            timestampFormatted: m.timestamp.toLocaleString('ru-RU'),
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

  const addMarker = (chartType: 'temperature' | 'humidity', timestamp: number) => {
    const markers = chartType === 'temperature' ? temperatureMarkers : humidityMarkers;
    const colorIndex = markers.length % markerColors.length;
    
    const newMarker: VerticalMarker = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp,
      comment: '',
      color: markerColors[colorIndex]
    };

    if (chartType === 'temperature') {
      setTemperatureMarkers(prev => [...prev, newMarker]);
    } else {
      setHumidityMarkers(prev => [...prev, newMarker]);
    }

    setEditingMarker({ markerId: newMarker.id, chartType });
  };

  const updateMarkerComment = (markerId: string, chartType: 'temperature' | 'humidity', comment: string) => {
    if (chartType === 'temperature') {
      setTemperatureMarkers(prev => prev.map(marker => 
        marker.id === markerId ? { ...marker, comment } : marker
      ));
    } else {
      setHumidityMarkers(prev => prev.map(marker => 
        marker.id === markerId ? { ...marker, comment } : marker
      ));
    }
  };

  const removeMarker = (markerId: string, chartType: 'temperature' | 'humidity') => {
    if (chartType === 'temperature') {
      setTemperatureMarkers(prev => prev.filter(marker => marker.id !== markerId));
    } else {
      setHumidityMarkers(prev => prev.filter(marker => marker.id !== markerId));
    }
  };

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

  const formatXAxisTick = (tickItem: number) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {date.toLocaleString('ru-RU')}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'temperature' ? 'Температура' : 'Влажность'}: {entry.value}
              {entry.dataKey === 'temperature' ? '°C' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (data: any, chartType: 'temperature' | 'humidity') => {
    if (data && data.activeLabel) {
      addMarker(chartType, data.activeLabel);
    }
  };

  const isFormValid = () => {
    return researchInfo.reportNumber && 
           researchInfo.reportDate && 
           researchInfo.templateFile && 
           researchInfo.objectName;
  };

  const renderChart = (
    dataKey: 'temperature' | 'humidity',
    markers: VerticalMarker[],
    limits: Limits,
    chartType: 'temperature' | 'humidity',
    title: string,
    unit: string,
    color: string
  ) => {
    const filteredData = chartData.filter(d => d[dataKey] !== undefined);
    
    if (filteredData.length === 0) {
      return (
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={filteredData}
            onClick={(data) => handleChartClick(data, chartType)}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisTick}
              angle={-45}
              textAnchor="end"
              height={60}
              stroke="#6b7280"
            />
            <YAxis 
              domain={['dataMin - 1', 'dataMax + 1']}
              stroke="#6b7280"
              label={{ value: `${title} (${unit})`, angle: -90, position: 'insideLeft' }}
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
            {markers.map(marker => (
              <ReferenceLine 
                key={marker.id}
                x={marker.timestamp}
                stroke={marker.color}
                strokeWidth={2}
                label={{ 
                  value: marker.comment || 'Маркер', 
                  position: 'top',
                  style: { fill: marker.color, fontWeight: 'bold' }
                }}
              />
            ))}
            
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={false}
              name={title}
              connectNulls={false}
            />
            
            <Brush 
              dataKey="timestamp" 
              height={30}
              stroke={color}
              tickFormatter={formatXAxisTick}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Управление маркерами */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Маркеры времени</h4>
            <p className="text-xs text-gray-500">Кликните по графику для добавления маркера</p>
          </div>
          
          {markers.length > 0 ? (
            <div className="space-y-2">
              {markers.map(marker => (
                <div key={marker.id} className="flex items-center space-x-3 bg-white p-2 rounded border">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: marker.color }}
                  />
                  <div className="flex-1">
                    <div className="text-xs text-gray-600">
                      {new Date(marker.timestamp).toLocaleString('ru-RU')}
                    </div>
                    {editingMarker?.markerId === marker.id && editingMarker?.chartType === chartType ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="text"
                          value={newMarkerComment}
                          onChange={(e) => setNewMarkerComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateMarkerComment(marker.id, chartType, newMarkerComment);
                              setEditingMarker(null);
                              setNewMarkerComment('');
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Введите комментарий"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            updateMarkerComment(marker.id, chartType, newMarkerComment);
                            setEditingMarker(null);
                            setNewMarkerComment('');
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingMarker(null);
                            setNewMarkerComment('');
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-xs text-gray-800 cursor-pointer hover:text-indigo-600 mt-1"
                        onClick={() => {
                          setEditingMarker({ markerId: marker.id, chartType });
                          setNewMarkerComment(marker.comment);
                        }}
                      >
                        {marker.comment || 'Нажмите для добавления комментария'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeMarker(marker.id, chartType)}
                    className="text-red-600 hover:text-red-800"
                    title="Удалить маркер"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Кликните по графику для добавления маркеров времени</p>
          )}
        </div>

        {/* Временные периоды */}
        {markers.length >= 2 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Временные периоды
            </h4>
            {calculateTimePeriods(markers).map((period, index) => (
              <div key={index} className="bg-white p-3 rounded border mb-2 last:mb-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-blue-700">Период {index + 1}:</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="font-medium">Начало:</span> {period.start}
                    {period.startComment && <span className="text-gray-600 ml-2">({period.startComment})</span>}
                  </div>
                  <div>
                    <span className="font-medium">Конец:</span> {period.end}
                    {period.endComment && <span className="text-gray-600 ml-2">({period.endComment})</span>}
                  </div>
                  <div className="font-medium text-blue-700">
                    <span>Длительность:</span> {period.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
              Кликните по графику для добавления маркера времени. Используйте Brush (внизу графика) для масштабирования.
            </p>
            {renderChart(
              'temperature',
              temperatureMarkers,
              temperatureLimits,
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
                Кликните по графику для добавления маркера времени. Используйте Brush (внизу графика) для масштабирования.
              </p>
              {renderChart(
                'humidity',
                humidityMarkers,
                humidityLimits,
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
              <span className="font-medium">Маркеры:</span> 
              <span className="ml-1">
                Температура: {temperatureMarkers.length}, Влажность: {humidityMarkers.length}
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