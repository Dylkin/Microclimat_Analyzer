import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Upload, Settings, Plus, Trash2, Edit2, Save, X, BarChart, FileText, Thermometer, Droplets } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { ReportGenerator } from '../utils/reportGenerator';
import { useAuth } from '../contexts/AuthContext';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack }) => {
  const { user } = useAuth();
  const { data, loading, error } = useTimeSeriesData({ files });
  
  // Chart settings
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | undefined>();
  
  // Report settings
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [reportData, setReportData] = useState({
    reportNumber: '',
    reportDate: new Date().toISOString().split('T')[0],
    objectName: '',
    climateSystemName: '',
    testType: 'empty-object',
    conclusion: '',
    director: ''
  });
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Chart dimensions
  const chartWidth = 1200;
  const chartHeight = 400;
  const chartMargin = { top: 20, right: 60, bottom: 60, left: 80 };

  // Generate analysis results table data
  const analysisResults = useMemo(() => {
    if (!data || !data.points.length) return [];

    // Фильтруем данные по времени если применен зум
    let filteredPoints = data.points;
    if (zoomState) {
      filteredPoints = data.points.filter(point => 
        point.timestamp >= zoomState.startTime && point.timestamp <= zoomState.endTime
      );
    }

    return files.map((file) => {
      // Find data points for this file
      const filePoints = filteredPoints.filter(point => point.fileId === file.name);
      
      if (filePoints.length === 0) {
        return {
          zoneNumber: file.zoneNumber || '-',
          measurementLevel: file.measurementLevel || '-',
          loggerName: file.name.substring(0, 6),
          serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
          minTemp: '-',
          maxTemp: '-',
          avgTemp: '-',
          minHumidity: '-',
          maxHumidity: '-',
          avgHumidity: '-',
          meetsLimits: '-'
        };
      }

      // Calculate temperature statistics
      const temperatures = filePoints
        .filter(p => p.temperature !== undefined)
        .map(p => p.temperature!);
      
      const humidities = filePoints
        .filter(p => p.humidity !== undefined)
        .map(p => p.humidity!);

      let tempStats = { min: '-', max: '-', avg: '-' };
      let humidityStats = { min: '-', max: '-', avg: '-' };
      
      if (temperatures.length > 0) {
        const min = Math.min(...temperatures);
        const max = Math.max(...temperatures);
        const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        
        tempStats = {
          min: Math.round(min * 10) / 10,
          max: Math.round(max * 10) / 10,
          avg: Math.round(avg * 10) / 10
        };
      }
      
      if (humidities.length > 0) {
        const min = Math.min(...humidities);
        const max = Math.max(...humidities);
        const avg = humidities.reduce((sum, h) => sum + h, 0) / humidities.length;
        
        humidityStats = {
          min: Math.round(min * 10) / 10,
          max: Math.round(max * 10) / 10,
          avg: Math.round(avg * 10) / 10
        };
      }

      // Check if meets limits
      let meetsLimits = 'Да';
      if (limits.temperature && temperatures.length > 0) {
        const min = Math.min(...temperatures);
        const max = Math.max(...temperatures);
        
        if (limits.temperature.min !== undefined && min < limits.temperature.min) {
          meetsLimits = 'Нет';
        }
        if (limits.temperature.max !== undefined && max > limits.temperature.max) {
          meetsLimits = 'Нет';
        }
      }

      return {
        zoneNumber: file.zoneNumber || '-',
        measurementLevel: file.measurementLevel || '-',
        loggerName: file.name.substring(0, 6), // Первые 6 символов названия файла
        serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
        minTemp: tempStats.min,
        maxTemp: tempStats.max,
        avgTemp: tempStats.avg,
        minHumidity: humidityStats.min,
        maxHumidity: humidityStats.max,
        avgHumidity: humidityStats.avg,
        meetsLimits
      };
    });
  }, [data, files, limits, zoomState]); // Добавляем zoomState в зависимости

  const handleLimitChange = (type: DataType, limitType: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setLimits(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [limitType]: numValue
      }
    }));
  };

  const handleAddMarker = useCallback((timestamp: number) => {
    const newMarker: VerticalMarker = {
      id: Date.now().toString(),
      timestamp,
      label: `Маркер ${markers.length + 1}`,
      color: '#8b5cf6'
    };
    setMarkers(prev => [...prev, newMarker]);
  }, [markers.length]);

  const handleUpdateMarker = (id: string, label: string) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, label } : m));
    setEditingMarker(null);
  };

  const handleDeleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const handleResetZoom = () => {
    setZoomState(undefined);
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setTemplateFile(file);
      setReportStatus({ type: 'success', message: `Шаблон "${file.name}" загружен успешно` });
    } else {
      setReportStatus({ type: 'error', message: 'Пожалуйста, загрузите файл в формате .docx' });
    }
  };

  const handleGenerateReport = async () => {
    if (!templateFile) {
      setReportStatus({ type: 'error', message: 'Пожалуйста, загрузите шаблон отчета' });
      return;
    }

    if (!reportData.reportNumber || !reportData.objectName) {
      setReportStatus({ type: 'error', message: 'Пожалуйста, заполните обязательные поля' });
      return;
    }

    setGeneratingReport(true);
    setReportStatus(null);

    try {
      const reportGenerator = ReportGenerator.getInstance();
      const result = await reportGenerator.generateReport(
        templateFile,
        {
          ...reportData,
          limits,
          markers,
          resultsTableData: analysisResults,
          user: user!
        },
        chartRef.current || undefined
      );

      if (result.success) {
        setReportStatus({ 
          type: 'success', 
          message: `Отчет "${result.fileName}" успешно сгенерирован и скачан` 
        });
      } else {
        setReportStatus({ 
          type: 'error', 
          message: result.error || 'Ошибка генерации отчета' 
        });
      }
    } catch (error) {
      setReportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Ошибка загрузки данных</h3>
        <p className="text-red-600">{error}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Вернуться назад
          </button>
        )}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Нет данных для анализа</h3>
        <p className="text-yellow-600">Загруженные файлы не содержат данных измерений.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Вернуться назад
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <BarChart className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Анализатор временных рядов</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Настройки</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Настройки анализа</h3>
          
          {/* Data Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип данных</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setDataType('temperature')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  dataType === 'temperature'
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Thermometer className="w-4 h-4" />
                <span>Температура</span>
              </button>
              {data.hasHumidity && (
                <button
                  onClick={() => setDataType('humidity')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    dataType === 'humidity'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  <span>Влажность</span>
                </button>
              )}
            </div>
          </div>

          {/* Limits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Лимиты {dataType === 'temperature' ? 'температуры (°C)' : 'влажности (%)'}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Минимум</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits[dataType]?.min ?? ''}
                  onChange={(e) => handleLimitChange(dataType, 'min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Максимум</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits[dataType]?.max ?? ''}
                  onChange={(e) => handleLimitChange(dataType, 'max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Не установлен"
                />
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          {zoomState && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Управление масштабом</label>
              <button
                onClick={handleResetZoom}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Сбросить масштаб
              </button>
            </div>
          )}
        </div>
      )}

      {/* Рекомендации */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Рекомендации по работе</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <h4 className="font-medium">Анализ данных:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Выделите область на графике для увеличения масштаба</li>
              <li>Двойной клик для добавления временных маркеров</li>
              <li>Установите лимиты для автоматической проверки соответствия</li>
              <li>Переключайтесь между температурой и влажностью</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Генерация отчетов:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Загрузите DOCX шаблон с плейсхолдерами</li>
              <li>Заполните информацию об исследовании</li>
              <li>Добавьте выводы по результатам анализа</li>
              <li>График автоматически включается в отчет</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Совет:</strong> При изменении масштаба графика таблица результатов автоматически обновляется, 
            показывая статистику только для выбранного временного периода.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            График {dataType === 'temperature' ? 'температуры' : 'влажности'}
          </h3>
          <p className="text-sm text-gray-600">
            Двойной клик для добавления маркера, выделение области для увеличения
          </p>
        </div>
        
        <div ref={chartRef}>
          <TimeSeriesChart
            data={data.points}
            width={chartWidth}
            height={chartHeight}
            margin={chartMargin}
            dataType={dataType}
            limits={limits}
            markers={markers}
            zoomState={zoomState}
            onZoomChange={setZoomState}
            onMarkerAdd={handleAddMarker}
            yAxisLabel={dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'}
          />
        </div>
      </div>

      {/* Markers */}
      {markers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Маркеры</h3>
          <div className="space-y-2">
            {markers.map((marker) => (
              <div key={marker.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: marker.color }}
                  ></div>
                  {editingMarker === marker.id ? (
                    <input
                      type="text"
                      value={marker.label}
                      onChange={(e) => setMarkers(prev => 
                        prev.map(m => m.id === marker.id ? { ...m, label: e.target.value } : m)
                      )}
                      onBlur={() => setEditingMarker(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingMarker(null);
                        }
                      }}
                      className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{marker.label}</span>
                  )}
                  <span className="text-sm text-gray-500">
                    {new Date(marker.timestamp).toLocaleString('ru-RU')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingMarker(marker.id)}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMarker(marker.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № зоны измерения
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Уровень измерения (м.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование логгера (6 символов)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Серийный № логгера
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Мин. t°C
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Макс. t°C
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Среднее t°C
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Соответствие лимитам
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisResults.map((result, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.zoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.measurementLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.loggerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.serialNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.minTemp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.maxTemp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.avgTemp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      result.meetsLimits === 'Да' 
                        ? 'bg-green-100 text-green-800' 
                        : result.meetsLimits === 'Нет'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {result.meetsLimits}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Обозначения:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span>Минимальное значение в выбранном периоде</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Максимальное значение в выбранном периоде</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Да
              </span>
              <span>Соответствует лимитам</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                Нет
              </span>
              <span>Не соответствует лимитам</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">DL-023</span>
              <span>Наименование логгера (первые 6 символов файла)</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <strong>Примечание:</strong> При изменении масштаба графика статистика пересчитывается только для выбранного временного периода.
          </div>
        </div>
      </div>

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Генерация отчета</h3>
        
        {/* Template Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Шаблон отчета (DOCX)
          </label>
          <div className="flex items-center space-x-3">
            <input
              ref={templateInputRef}
              type="file"
              accept=".docx"
              onChange={handleTemplateUpload}
              className="hidden"
            />
            <button
              onClick={() => templateInputRef.current?.click()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить шаблон</span>
            </button>
            {templateFile && (
              <span className="text-sm text-green-600">
                Загружен: {templateFile.name}
              </span>
            )}
          </div>
        </div>

        {/* Report Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер отчета *
            </label>
            <input
              type="text"
              value={reportData.reportNumber}
              onChange={(e) => setReportData(prev => ({ ...prev, reportNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата отчета
            </label>
            <input
              type="date"
              value={reportData.reportDate}
              onChange={(e) => setReportData(prev => ({ ...prev, reportDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Объект исследования *
            </label>
            <input
              type="text"
              value={reportData.objectName}
              onChange={(e) => setReportData(prev => ({ ...prev, objectName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Климатическая установка
            </label>
            <input
              type="text"
              value={reportData.climateSystemName}
              onChange={(e) => setReportData(prev => ({ ...prev, climateSystemName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип испытания
            </label>
            <select
              value={reportData.testType}
              onChange={(e) => setReportData(prev => ({ ...prev, testType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="empty-object">Соответствие критериям в пустом объекте</option>
              <option value="loaded-object">Соответствие критериям в загруженном объекте</option>
              <option value="door-opening">Открытие двери</option>
              <option value="power-off">Отключение электропитания</option>
              <option value="power-on">Включение электропитания</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Руководитель
            </label>
            <input
              type="text"
              value={reportData.director}
              onChange={(e) => setReportData(prev => ({ ...prev, director: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Conclusion */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Выводы и заключение
          </label>
          <textarea
            value={reportData.conclusion}
            onChange={(e) => setReportData(prev => ({ ...prev, conclusion: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Введите выводы по результатам анализа..."
          />
        </div>

        {/* Status */}
        {reportStatus && (
          <div className={`mb-4 p-4 rounded-lg ${
            reportStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {reportStatus.message}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerateReport}
          disabled={generatingReport || !templateFile}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {generatingReport ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Генерация...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Сгенерировать отчет</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};