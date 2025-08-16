import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Settings, Plus, Trash2, Edit2, Save, X, BarChart, Thermometer, Droplets, Download, FileText, ExternalLink, XCircle, CheckCircle } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';
import { DocxTemplateProcessor, TemplateReportData } from '../utils/docxTemplateProcessor';

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
  
  // Contract fields
  const [contractFields, setContractFields] = useState({
    contractNumber: '',
    contractDate: '',
    researchObject: '',
    climateInstallation: '',
    testType: ''
  });
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState('');
  const [reportStatus, setReportStatus] = useState<{
    isGenerating: boolean;
    hasReport: boolean;
    reportUrl: string | null;
    reportFilename: string | null;
    templateFile: File | null;
    templateValidation: { isValid: boolean; errors: string[] } | null;
  }>({
    isGenerating: false,
    hasReport: false,
    reportUrl: null,
    reportFilename: null,
    templateFile: null,
    templateValidation: null
  });
  
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

  const handleContractFieldChange = (field: keyof typeof contractFields, value: string) => {
    setContractFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setReportStatus(prev => ({ 
        ...prev, 
        templateFile: file,
        templateValidation: null 
      }));
      
      // Валидируем шаблон
      validateTemplate(file);
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const validateTemplate = async (file: File) => {
    try {
      const processor = DocxTemplateProcessor.getInstance();
      const validation = await processor.validateTemplate(file);
      
      setReportStatus(prev => ({ 
        ...prev, 
        templateValidation: validation 
      }));
      
      if (!validation.isValid) {
        console.warn('Ошибки валидации шаблона:', validation.errors);
      }
    } catch (error) {
      console.error('Ошибка валидации шаблона:', error);
      setReportStatus(prev => ({ 
        ...prev, 
        templateValidation: { 
          isValid: false, 
          errors: ['Ошибка чтения файла шаблона'] 
        } 
      }));
    }
  };
  const handleRemoveTemplate = () => {
    setReportStatus(prev => ({ 
      ...prev, 
      templateFile: null,
      templateValidation: null 
    }));
  };

  const handleGenerateTemplateReport = async () => {
    if (!reportStatus.templateFile || !chartRef.current) {
      alert('Необходимо загрузить шаблон и убедиться, что график отображается');
      return;
    }

    if (reportStatus.templateValidation && !reportStatus.templateValidation.isValid) {
      alert('Шаблон содержит ошибки. Пожалуйста, исправьте их перед генерацией отчета.');
      return;
    }

    setReportStatus(prev => ({ ...prev, isGenerating: true }));

    try {
      // Получаем экземпляр процессора
      const processor = DocxTemplateProcessor.getInstance();
      
      // Если уже есть отчет, устанавливаем его для добавления данных
      if (reportStatus.hasReport && reportStatus.reportUrl) {
        const existingReportResponse = await fetch(reportStatus.reportUrl);
        const existingReportBlob = await existingReportResponse.blob();
        processor.setExistingReport(existingReportBlob);
      } else {
        processor.clearExistingReport();
      }
      
      // Генерируем данные для шаблона
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU');
      const timeStr = now.toLocaleTimeString('ru-RU');
      const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
      
      // Функция для получения читаемого названия типа испытания
      const getTestTypeLabel = (testType: string): string => {
        switch (testType) {
          case 'empty_volume':
            return 'Испытание на соответствие критериям в пустом объеме';
          case 'loaded_volume':
            return 'Испытание на соответствие критериям в загруженном объеме';
          case 'temperature_recovery':
            return 'Испытание по восстановлению температуры после открытия двери';
          case 'power_off':
            return 'Испытание на отключение электропитания';
          case 'power_on':
            return 'Испытание на включение электропитания';
          default:
            return testType;
        }
      };
      
      const templateData: TemplateReportData = {
        title: `Отчет по анализу временных рядов - ${dataTypeLabel}`,
        date: `${dateStr} ${timeStr}`,
        dataType,
        analysisResults,
        conclusions,
        researchObject: contractFields.researchObject || '',
        conditioningSystem: contractFields.climateInstallation || '',
        testType: getTestTypeLabel(contractFields.testType) || ''
      };

      // Обрабатываем шаблон
      const docxBlob = await processor.processTemplate(
        reportStatus.templateFile,
        templateData,
        chartRef.current
      );

      // Освобождаем старый URL если он есть
      if (reportStatus.reportUrl) {
        URL.revokeObjectURL(reportStatus.reportUrl);
      }

      // Создаем URL для скачивания
      const reportUrl = URL.createObjectURL(docxBlob);
      const reportFilename = reportStatus.hasReport 
        ? reportStatus.reportFilename // Сохраняем старое имя файла
        : `отчет_шаблон_${dataTypeLabel}_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}.docx`;

      // Обновляем состояние
      setReportStatus(prev => ({
        ...prev,
        isGenerating: false,
        hasReport: true,
        reportUrl,
        reportFilename
      }));
      
    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      alert(`Ошибка при формировании отчета по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setReportStatus(prev => ({ ...prev, isGenerating: false }));
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

    // Очищаем существующий отчет в процессоре
    const processor = DocxTemplateProcessor.getInstance();
    processor.clearExistingReport();

    setReportStatus({
      isGenerating: false,
      hasReport: false,
      reportUrl: null,
      reportFilename: null,
      templateFile: null,
      templateValidation: null
    });
  };

  const handleAutoFillConclusions = () => {
    // Определяем временные рамки
    let startTime: Date;
    let endTime: Date;
    let duration: number;

    if (markers.length >= 2) {
      // Если есть маркеры, используем первый и последний
      const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
      startTime = new Date(sortedMarkers[0].timestamp);
      endTime = new Date(sortedMarkers[sortedMarkers.length - 1].timestamp);
    } else if (zoomState) {
      // Если применен зум, используем его границы
      startTime = new Date(zoomState.startTime);
      endTime = new Date(zoomState.endTime);
    } else if (data) {
      // Иначе используем полный диапазон данных
      startTime = new Date(data.timeRange[0]);
      endTime = new Date(data.timeRange[1]);
    } else {
      return; // Нет данных для анализа
    }

    duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // в минутах

    // Находим минимальное и максимальное значения (исключая внешние датчики)
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const validResults = nonExternalResults.filter(result => 
      result.minTemp !== '-' && result.maxTemp !== '-'
    );

    if (validResults.length === 0) {
      setConclusions('Недостаточно данных для формирования выводов.');
      return;
    }

    // Находим результат с минимальной температурой
    const minTempResult = validResults.reduce((min, current) => {
      const minTemp = parseFloat(min.minTemp);
      const currentMinTemp = parseFloat(current.minTemp);
      return currentMinTemp < minTemp ? current : min;
    });

    // Находим результат с максимальной температурой
    const maxTempResult = validResults.reduce((max, current) => {
      const maxTemp = parseFloat(max.maxTemp);
      const currentMaxTemp = parseFloat(current.maxTemp);
      return currentMaxTemp > maxTemp ? current : max;
    });

    // Проверяем соответствие лимитам
    let meetsLimits = true;
    if (limits.temperature) {
      const minTemp = parseFloat(minTempResult.minTemp);
      const maxTemp = parseFloat(maxTempResult.maxTemp);
      
      if (limits.temperature.min !== undefined && minTemp < limits.temperature.min) {
        meetsLimits = false;
      }
      if (limits.temperature.max !== undefined && maxTemp > limits.temperature.max) {
        meetsLimits = false;
      }
    }

    // Формируем текст выводов
    const conclusionText = `Начало испытания: ${startTime.toLocaleString('ru-RU')}
Завершение испытания: ${endTime.toLocaleString('ru-RU')}
Длительность испытания: ${duration} минут
Зафиксированное минимальное значение: ${minTempResult.minTemp}°C в зоне измерения ${minTempResult.zoneNumber} на высоте ${minTempResult.measurementLevel} м.
Зафиксированное максимальное значение: ${maxTempResult.maxTemp}°C в зоне измерения ${maxTempResult.zoneNumber} на высоте ${maxTempResult.measurementLevel} м.
Результаты испытания ${meetsLimits ? 'соответствуют' : 'не соответствуют'} заданному критерию приемлемости.`;

    setConclusions(conclusionText);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        testType: getTestTypeLabel(contractFields.testType) || ''
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

        {/* Contract Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Информация о договоре</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">№ договора</label>
              <input
                type="text"
                value={contractFields.contractNumber}
                onChange={(e) => handleContractFieldChange('contractNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите номер договора"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата договора</label>
              <input
                type="date"
                value={contractFields.contractDate}
                onChange={(e) => handleContractFieldChange('contractDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Объект исследования</label>
              <input
                type="text"
                value={contractFields.researchObject}
                onChange={(e) => handleContractFieldChange('researchObject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите объект исследования"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Климатическая установка</label>
              <input
                type="text"
                value={contractFields.climateInstallation}
                onChange={(e) => handleContractFieldChange('climateInstallation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите тип климатической установки"
              />
            </div>
          </div>
          
          {/* Test Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип испытания</label>
            <select
              value={contractFields.testType}
              onChange={(e) => handleContractFieldChange('testType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Выберите тип испытания</option>
              <option value="empty_volume">Испытание на соответствие критериям в пустом объеме</option>
              <option value="loaded_volume">Испытание на соответствие критериям в загруженном объеме</option>
              <option value="temperature_recovery">Испытание по восстановлению температуры после открытия двери</option>
              <option value="power_off">Испытание на отключение электропитания</option>
              <option value="power_on">Испытание на включение электропитания</option>
            </select>
          </div>
        </div>
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

        {/* Поле для выводов */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выводы
          </label>
          <textarea
            value={conclusions}
            onChange={(e) => setConclusions(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder="Введите выводы по результатам анализа..."
          />
          <button
            onClick={handleAutoFillConclusions}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Заполнить
          </button>
        </div>
      </div>

      {/* Кнопка формирования отчета */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            Формирование приложения к отчету с результатами испытаний
          </h2>
          
          {/* Загрузка шаблона DOCX */}
          <div className="w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              Использование пользовательского шаблона с плейсхолдером {'{chart}'}
            </h3>
            
            {!reportStatus.templateFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleTemplateUpload}
                  className="hidden"
                  id="template-upload"
                />
                <label
                  htmlFor="template-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Загрузить DOCX шаблон
                  </span>
                  <span className="text-xs text-gray-500">
                    Должен содержать плейсхолдер {'{chart}'} для вставки графика
                  </span>
                </label>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {reportStatus.templateFile.name}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveTemplate}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить шаблон"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Результат валидации */}
                {reportStatus.templateValidation && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    reportStatus.templateValidation.isValid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {reportStatus.templateValidation.isValid ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Шаблон валиден</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <XCircle className="w-3 h-3" />
                          <span>Ошибки в шаблоне:</span>
                        </div>
                        <ul className="list-disc list-inside ml-4">
                          {reportStatus.templateValidation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Кнопка генерации отчета */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateTemplateReport}
              disabled={
                reportStatus.isGenerating || 
                !reportStatus.templateFile || 
                (reportStatus.templateValidation && !reportStatus.templateValidation.isValid)
              }
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Сформировать отчет по загруженному шаблону"
            >
              {reportStatus.isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Формирование отчета...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Сформировать отчет</span>
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
          
          {/* Информация о плейсхолдерах для шаблона */}
          <div className="w-full max-w-2xl bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Поддерживаемые плейсхолдеры в шаблоне:
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <code>{'{chart}'}</code> - изображение графика (PNG)</p>
              <p>• <code>{'{resultsTable}'}</code> - таблица результатов анализа</p>
              <p>• <code>{'{Result}'}</code> - текст выводов из поля "Выводы"</p>
              <p>• <code>{'{Object}'}</code> - объект исследования</p>
              <p>• <code>{'{ConditioningSystem}'}</code> - климатическая установка</p>
              <p>• <code>{'{System}'}</code> - климатическая установка</p>
              <p>• <code>{'{NameTest}'}</code> - тип испытания</p>
            </div>
            <p className="text-xs"><strong>Важно:</strong> Плейсхолдер <code>{'{chart}'}</code> обязателен для корректной работы шаблона. Изображение будет вставлено с высоким разрешением и повернуто на 90° против часовой стрелки. Плейсхолдер <code>{'{resultsTable}'}</code> создает полную таблицу с результатами анализа. Плейсхолдеры <code>{'{Result}'}</code>, <code>{'{Object}'}</code>, <code>{'{ConditioningSystem}'}</code>, <code>{'{System}'}</code> и <code>{'{NameTest}'}</code> заменяются на соответствующие текстовые данные.</p>
          </div>
        </div>
      </div>
    </div>
  );
};