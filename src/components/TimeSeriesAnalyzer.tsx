import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Settings, Plus, Trash2, Edit2, Save, X, BarChart, Thermometer, Droplets, Download, FileText, ExternalLink, Upload } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';
import { DocxReportGenerator, ReportData } from '../utils/docxGenerator';
import { TemplateReportGenerator, TemplateReportData } from '../utils/templateReportGenerator';

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
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<{
    isGenerating: boolean;
    hasReport: boolean;
    reportUrl: string | null;
    reportFilename: string | null;
    isGeneratingFromTemplate: boolean;
  }>({
    isGenerating: false,
    hasReport: false,
    reportUrl: null,
    reportFilename: null,
    isGeneratingFromTemplate: false
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для отслеживания процесса генерации из шаблона
  const [isGeneratingFromTemplate, setIsGeneratingFromTemplate] = useState(false);
  
  // Chart dimensions
  const chartWidth = 1200;
  const chartHeight = 400;
  const chartMargin = { top: 20, right: 60, bottom: 60, left: 80 };

  // Ref для элемента графика
  const chartRef = useRef<HTMLDivElement>(null);

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
        zoneNumber: file.zoneNumber === 999 ? 'Внешний' : (file.zoneNumber || '-'),
        measurementLevel: file.measurementLevel || '-',
        loggerName: file.name.substring(0, 6), // Первые 6 символов названия файла
        serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
        minTemp: tempStats.min,
        maxTemp: tempStats.max,
        avgTemp: tempStats.avg,
        minHumidity: humidityStats.min,
        maxHumidity: humidityStats.max,
        avgHumidity: humidityStats.avg,
        meetsLimits,
        isExternal: file.zoneNumber === 999
      };
    });
  }, [data, files, limits, zoomState]); // Добавляем zoomState в зависимости

  // Вычисляем глобальные минимальные и максимальные значения (исключая внешние датчики)
  const { globalMinTemp, globalMaxTemp } = useMemo(() => {
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    return {
      globalMinTemp: minTempValues.length > 0 ? Math.min(...minTempValues) : null,
      globalMaxTemp: maxTempValues.length > 0 ? Math.max(...maxTempValues) : null
    };
  }, [analysisResults]);

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

  const handleGenerateReport = async () => {
    if (!chartRef.current) {
      alert('График не найден для сохранения');
      return;
    }

    setReportStatus(prev => ({ ...prev, isGenerating: true }));

    try {
      // Временно скрываем кнопку сохранения
      const saveButton = chartRef.current.querySelector('button[title="Сформировать отчет с графиком"]') as HTMLElement;
      const originalDisplay = saveButton ? saveButton.style.display : '';
      if (saveButton) {
        saveButton.style.display = 'none';
      }

      // Находим контейнер с графиком и легендой (исключая кнопку)
      const chartContainer = chartRef.current;
      
      // Создаем скриншот с высоким качеством
      const canvas = await html2canvas(chartContainer, {
        scale: 2, // Увеличиваем разрешение для лучшего качества
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight
      });

      // Восстанавливаем отображение кнопки
      if (saveButton) {
        saveButton.style.display = originalDisplay;
      }

      // Создаем новый canvas для поворота изображения на 90° против часовой стрелки
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Ошибка создания контекста для поворота изображения');
      }

      // Устанавливаем размеры повернутого canvas (меняем местами ширину и высоту)
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;

      // Поворачиваем контекст на 90° против часовой стрелки
      ctx.translate(0, canvas.width);
      ctx.rotate(-Math.PI / 2);

      // Рисуем исходное изображение на повернутом canvas
      ctx.drawImage(canvas, 0, 0);

      // Конвертируем повернутый canvas в blob
      const chartBlob = await new Promise<Blob>((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Ошибка создания изображения графика'));
          }
        }, 'image/png', 1.0);
      });

      // Генерируем данные для отчета
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU');
      const timeStr = now.toLocaleTimeString('ru-RU');
      const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
      
      const reportData: ReportData = {
        title: `Отчет по анализу временных рядов - ${dataTypeLabel}`,
        date: `${dateStr} ${timeStr}`,
        dataType,
        chartImageBlob: chartBlob,
        analysisResults
      };

      // Генерируем DOCX отчет
      const docxGenerator = DocxReportGenerator.getInstance();
      const docxBlob = await docxGenerator.generateReport(reportData);

      // Создаем URL для скачивания
      const reportUrl = URL.createObjectURL(docxBlob);
      const reportFilename = `отчет_${dataTypeLabel}_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}.docx`;

      // Обновляем состояние
      setReportStatus({
        isGenerating: false,
        hasReport: true,
        reportUrl,
        reportFilename,
        isGeneratingFromTemplate: false
      });
      
    } catch (error) {
      console.error('Ошибка сохранения графика:', error);
      alert('Ошибка при сохранении графика');
      setReportStatus(prev => ({ ...prev, isGenerating: false }));
    } finally {
      // Убеждаемся, что кнопка восстановлена в случае ошибки
      const saveButton = chartRef.current?.querySelector('button[title="Сформировать отчет с графиком"]') as HTMLElement;
      if (saveButton && saveButton.style.display === 'none') {
        saveButton.style.display = '';
      }
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.docx')) {
        alert('Пожалуйста, выберите файл в формате .docx');
        return;
      }
      setTemplateFile(file);
    }
  };

  const handleGenerateTemplateReport = async () => {
    if (!templateFile) {
      return;
    }

    if (!chartRef.current) {
      return;
    }

    setIsGeneratingFromTemplate(true);

    try {
      // Создаем скриншот графика
      const saveButton = chartRef.current.querySelector('button[title="Сформировать отчет с графиком"]') as HTMLElement;
      const originalDisplay = saveButton ? saveButton.style.display : '';
      if (saveButton) {
        saveButton.style.display = 'none';
      }

      const chartContainer = chartRef.current;
      const canvas = await html2canvas(chartContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: chartContainer.offsetWidth,
        height: chartContainer.offsetHeight
      });

      if (saveButton) {
        saveButton.style.display = originalDisplay;
      }

      // Поворачиваем изображение на 90° против часовой стрелки
      const rotatedCanvas = document.createElement('canvas');
      const ctx = rotatedCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Ошибка создания контекста для поворота изображения');
      }

      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
      ctx.translate(0, canvas.width);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(canvas, 0, 0);

      const chartBlob = await new Promise<Blob>((resolve, reject) => {
        rotatedCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Ошибка создания изображения графика'));
          }
        }, 'image/png', 1.0);
      });

      // Подготавливаем данные для шаблона
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU');
      const timeStr = now.toLocaleTimeString('ru-RU');
      const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
      
      const templateData: TemplateReportData = {
        chartImageBlob: chartBlob,
        analysisResults,
        executor: user?.fullName || 'Неизвестный пользователь',
        reportDate: `${dateStr} ${timeStr}`,
        dataType
      };

      // Генерируем отчет из шаблона
      const templateGenerator = TemplateReportGenerator.getInstance();
      const reportBlob = await templateGenerator.generateReportFromTemplate(templateFile, templateData);

      // Создаем URL для скачивания
      const reportUrl = URL.createObjectURL(reportBlob);
      const reportFilename = `отчет_по_шаблону_${dataTypeLabel}_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}.docx`;

      // Автоматически скачиваем файл
      const link = document.createElement('a');
      link.href = reportUrl;
      link.download = reportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Очищаем URL
      setTimeout(() => URL.revokeObjectURL(reportUrl), 1000);
      
    } catch (error) {
      console.error('Ошибка создания отчета из шаблона:', error);
    } finally {
      setIsGeneratingFromTemplate(false);
    }
  };

  const handleDownloadReport = () => {
    if (reportStatus.reportUrl && reportStatus.reportFilename) {
      const link = document.createElement('a');
      link.href = reportStatus.reportUrl;
      link.download = reportStatus.reportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteReport = () => {
    if (reportStatus.reportUrl) {
      URL.revokeObjectURL(reportStatus.reportUrl);
    }
    
    // Очищаем документ в генераторе
    const docxGenerator = DocxReportGenerator.getInstance();
    docxGenerator.clearDocument();
    
    setReportStatus({
      isGenerating: false,
      hasReport: false,
      reportUrl: null,
      reportFilename: null,
      isGeneratingFromTemplate: false
    });
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
      </div>

      {/* Settings Panel */}
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

      {/* Chart */}
      <div ref={chartRef} className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            График {dataType === 'temperature' ? 'температуры' : 'влажности'}
          </h3>
        </div>
        
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

      {/* Кнопка формирования отчета */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Загрузка шаблона */}
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон отчета (необязательно)
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
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Поддерживаемые плейсхолдеры:</strong><br/>
                  • <code>{'{chart}'}</code> - График временных рядов<br/>
                  • <code>{'{results table}'}</code> - Таблица результатов анализа<br/>
                  • <code>{'{executor}'}</code> - Сотрудник, сформировавший отчет<br/>
                  • <code>{'{report date}'}</code> - Дата формирования отчета
                </p>
              </div>
            </div>
            {templateFile && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Загружен шаблон:</strong> {templateFile.name}
                </p>
                <button
                  onClick={() => setTemplateFile(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Удалить шаблон
                </button>
              </div>
            )}
          </div>

          {/* Информация о плейсхолдерах */}
          <div className="w-full max-w-2xl">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-3">
                📋 Поддерживаемые плейсхолдеры для шаблонов
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">{'{chart}'}</code>
                  <span>График временных рядов</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">{'{results table}'}</code>
                  <span>Таблица результатов</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">{'{executor}'}</code>
                  <span>Сотрудник</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">{'{report date}'}</code>
                  <span>Дата отчета</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-600">
                <strong>Совет:</strong> Просто вставьте эти плейсхолдеры в ваш DOCX шаблон, и система автоматически заменит их на актуальные данные.
              </div>
            </div>
          </div>

          {/* Кнопки генерации отчетов */}
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {templateFile && (
              <button
                onClick={handleGenerateTemplateReport}
                disabled={isGeneratingFromTemplate}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGeneratingFromTemplate ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Создание отчета из шаблона...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Создать отчет из шаблона</span>
                  </>
                )}
              </button>
            )}
            
          <button
            onClick={handleGenerateReport}
            disabled={reportStatus.isGenerating}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            title="Сформировать отчет с графиком"
          >
            {reportStatus.isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Формирование отчета...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>{reportStatus.hasReport ? 'Обновить отчет' : 'Сформировать отчет'}</span>
              </>
            )}
          </button>
          </div>
          
          {/* Ссылка для скачивания и кнопка удаления */}
          {reportStatus.hasReport && reportStatus.reportUrl && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadReport}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Скачать отчет ({reportStatus.reportFilename})</span>
              </button>
              
              <button
                onClick={handleDeleteReport}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Удалить отчет"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results Table */}
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
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                    !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                    globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp
                      ? 'bg-blue-200' 
                      : ''
                  }`}>
                    {result.minTemp}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                    !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                    globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp
                      ? 'bg-red-200' 
                      : ''
                  }`}>
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
    </div>
  );
};