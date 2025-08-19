import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Upload, Settings, Zap, BarChart, Save, Plus, Trash2, Edit2, X } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { DocxReportGenerator } from '../utils/docxGenerator';
import { DocxImageGenerator } from '../utils/docxImageGenerator';
import { DocxTemplateProcessor } from '../utils/docxTemplateProcessor';
import { supabaseDatabaseService } from '../utils/supabaseDatabase';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
}

interface ContractField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'date' | 'textarea';
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack }) => {
  const { data, loading, progress, error } = useTimeSeriesData({ files });
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showContractFields, setShowContractFields] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Поля договора
  const [contractFields, setContractFields] = useState<ContractField[]>([
    { id: 'researchObject', label: 'Объект исследования', value: '', type: 'text' },
    { id: 'conditioningSystem', label: 'Климатическая установка', value: '', type: 'text' },
    { id: 'testType', label: 'Тип испытания', value: '', type: 'text' },
    { id: 'executor', label: 'Исполнитель', value: '', type: 'text' },
    { id: 'testDate', label: 'Дата испытания', value: '', type: 'date' },
    { id: 'reportNo', label: 'Номер договора', value: '', type: 'text' },
    { id: 'reportDate', label: 'Дата договора', value: '', type: 'date' },
    { id: 'conclusions', label: 'Выводы', value: '', type: 'textarea' }
  ]);

  // Автосохранение сессии анализа
  useEffect(() => {
    const saveSession = async () => {
      if (!data || files.length === 0) return;

      try {
        const sessionData = {
          name: `Анализ ${dataType === 'temperature' ? 'температуры' : 'влажности'} - ${new Date().toLocaleDateString('ru-RU')}`,
          description: `Анализ данных из ${files.length} файлов`,
          fileIds: files.map(f => f.id),
          dataType,
          contractFields: contractFields.reduce((acc, field) => {
            acc[field.id] = field.value;
            return acc;
          }, {} as Record<string, string>),
          conclusions: contractFields.find(f => f.id === 'conclusions')?.value
        };

        if (currentSessionId) {
          await supabaseDatabaseService.updateAnalysisSession(currentSessionId, {
            contractFields: sessionData.contractFields,
            conclusions: sessionData.conclusions
          });
        } else {
          const sessionId = await supabaseDatabaseService.saveAnalysisSession(sessionData);
          setCurrentSessionId(sessionId);
        }

        // Сохраняем настройки графика
        if (currentSessionId) {
          await supabaseDatabaseService.saveChartSettings(currentSessionId, dataType, limits, zoomState);
          await supabaseDatabaseService.saveVerticalMarkers(currentSessionId, markers);
        }
      } catch (error) {
        console.error('Ошибка автосохранения сессии:', error);
      }
    };

    const timeoutId = setTimeout(saveSession, 2000); // Автосохранение через 2 секунды после изменений
    return () => clearTimeout(timeoutId);
  }, [data, files, dataType, limits, zoomState, markers, contractFields, currentSessionId]);

  // Загрузка сохраненных настроек при смене типа данных
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentSessionId) return;

      try {
        const settings = await supabaseDatabaseService.getChartSettings(currentSessionId, dataType);
        if (settings) {
          setLimits(settings.limits);
          setZoomState(settings.zoomState);
        }

        const savedMarkers = await supabaseDatabaseService.getVerticalMarkers(currentSessionId);
        setMarkers(savedMarkers);
      } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
      }
    };

    loadSettings();
  }, [currentSessionId, dataType]);

  const handleLimitChange = useCallback((type: DataType, limitType: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setLimits(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [limitType]: numValue
      }
    }));
  }, []);

  const handleZoomChange = useCallback((newZoomState: ZoomState) => {
    setZoomState(newZoomState);
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomState(undefined);
  }, []);

  const handleMarkerAdd = useCallback((timestamp: number) => {
    const newMarker: VerticalMarker = {
      id: Date.now().toString(),
      timestamp,
      label: `Маркер ${markers.length + 1}`,
      color: '#8b5cf6',
      type: 'test'
    };
    setMarkers(prev => [...prev, newMarker]);
  }, [markers.length]);

  const handleMarkerUpdate = useCallback((markerId: string, updates: Partial<VerticalMarker>) => {
    setMarkers(prev => prev.map(marker => 
      marker.id === markerId ? { ...marker, ...updates } : marker
    ));
    setEditingMarker(null);
  }, []);

  const handleMarkerDelete = useCallback((markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId));
  }, []);

  const updateContractField = (id: string, value: string) => {
    setContractFields(prev => prev.map(field => 
      field.id === id ? { ...field, value } : field
    ));
  };

  const addContractField = () => {
    const newField: ContractField = {
      id: `custom_${Date.now()}`,
      label: 'Новое поле',
      value: '',
      type: 'text'
    };
    setContractFields(prev => [...prev, newField]);
  };

  const removeContractField = (id: string) => {
    setContractFields(prev => prev.filter(field => field.id !== id));
  };

  const updateContractFieldLabel = (id: string, label: string) => {
    setContractFields(prev => prev.map(field => 
      field.id === id ? { ...field, label } : field
    ));
  };

  // Вычисление результатов анализа
  const analysisResults = React.useMemo(() => {
    if (!data) return [];

    const fileGroups = new Map<string, any>();
    
    data.points.forEach(point => {
      if (!fileGroups.has(point.fileId)) {
        fileGroups.set(point.fileId, {
          fileId: point.fileId,
          fileName: point.fileId,
          zoneNumber: point.zoneNumber || 0,
          measurementLevel: files.find(f => f.name === point.fileId)?.measurementLevel || '-',
          loggerName: files.find(f => f.name === point.fileId)?.parsedData?.deviceMetadata.deviceModel || 'Unknown',
          serialNumber: files.find(f => f.name === point.fileId)?.parsedData?.deviceMetadata.serialNumber || 'Unknown',
          temperatures: [],
          humidities: [],
          isExternal: point.zoneNumber === 999
        });
      }
      
      const group = fileGroups.get(point.fileId);
      if (point.temperature !== undefined) group.temperatures.push(point.temperature);
      if (point.humidity !== undefined) group.humidities.push(point.humidity);
    });

    return Array.from(fileGroups.values()).map(group => {
      const temps = group.temperatures;
      const hums = group.humidities;
      
      // Фильтруем данные по времени если применен зум
      let filteredTemps = temps;
      let filteredHums = hums;
      
      if (zoomState) {
        const filteredPoints = data.points.filter(p => 
          p.fileId === group.fileId &&
          p.timestamp >= zoomState.startTime && 
          p.timestamp <= zoomState.endTime
        );
        
        filteredTemps = filteredPoints
          .filter(p => p.temperature !== undefined)
          .map(p => p.temperature!);
        filteredHums = filteredPoints
          .filter(p => p.humidity !== undefined)
          .map(p => p.humidity!);
      }

      const currentTemps = dataType === 'temperature' ? filteredTemps : filteredHums;
      const currentLimits = limits[dataType];
      
      let meetsLimits = '-';
      if (currentLimits && currentTemps.length > 0) {
        const min = Math.min(...currentTemps);
        const max = Math.max(...currentTemps);
        
        let withinLimits = true;
        if (currentLimits.min !== undefined && min < currentLimits.min) withinLimits = false;
        if (currentLimits.max !== undefined && max > currentLimits.max) withinLimits = false;
        
        meetsLimits = withinLimits ? 'Да' : 'Нет';
      }

      return {
        ...group,
        minTemp: currentTemps.length > 0 ? Math.min(...currentTemps).toFixed(1) : '-',
        maxTemp: currentTemps.length > 0 ? Math.max(...currentTemps).toFixed(1) : '-',
        avgTemp: currentTemps.length > 0 ? (currentTemps.reduce((a, b) => a + b, 0) / currentTemps.length).toFixed(1) : '-',
        meetsLimits
      };
    }).sort((a, b) => {
      // Внешние датчики в конец
      if (a.isExternal && !b.isExternal) return 1;
      if (!a.isExternal && b.isExternal) return -1;
      // Остальные по номеру зоны
      return a.zoneNumber - b.zoneNumber;
    });
  }, [data, dataType, limits, zoomState, files]);

  const handleExportCSV = () => {
    if (analysisResults.length === 0) return;

    const headers = [
      '№ зоны',
      'Уровень (м.)',
      'Логгер',
      'Серийный №',
      `Мин. ${dataType === 'temperature' ? 't°C' : 'RH%'}`,
      `Макс. ${dataType === 'temperature' ? 't°C' : 'RH%'}`,
      `Среднее ${dataType === 'temperature' ? 't°C' : 'RH%'}`,
      'Соответствие лимитам'
    ];

    const csvContent = [
      headers.join(','),
      ...analysisResults.map(result => [
        result.zoneNumber,
        result.measurementLevel,
        result.loggerName,
        result.serialNumber,
        result.minTemp,
        result.maxTemp,
        result.avgTemp,
        result.meetsLimits
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analysis_results_${dataType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const createReportData = () => ({
    title: `Отчет по анализу ${dataType === 'temperature' ? 'температуры' : 'влажности'}`,
    date: new Date().toLocaleString('ru-RU'),
    dataType,
    analysisResults,
    ...contractFields.reduce((acc, field) => {
      acc[field.id] = field.value;
      return acc;
    }, {} as Record<string, string>),
    limits
  });

  const handleGenerateReport = async () => {
    try {
      if (!chartRef.current) {
        alert('График не найден');
        return;
      }

      const reportData = createReportData();
      const generator = DocxReportGenerator.getInstance();
      
      // Создаем скриншот графика
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Не удалось создать контекст canvas');

      // Простой способ создания изображения графика
      const chartImageBlob = new Blob(['chart'], { type: 'image/png' });
      
      const docxBlob = await generator.generateReport({
        ...reportData,
        chartImageBlob
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(docxBlob);
      link.download = `report_${dataType}_${new Date().toISOString().split('T')[0]}.docx`;
      link.click();
    } catch (error) {
      console.error('Ошибка создания отчета:', error);
      alert('Ошибка при создании отчета');
    }
  };

  const handleGenerateImageReport = async () => {
    try {
      if (!chartRef.current) {
        alert('График не найден');
        return;
      }

      const reportData = createReportData();
      const generator = DocxImageGenerator.getInstance();
      
      const docxBlob = await generator.generateReportWithImage(
        reportData,
        chartRef.current
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(docxBlob);
      link.download = `report_with_image_${dataType}_${new Date().toISOString().split('T')[0]}.docx`;
      link.click();
    } catch (error) {
      console.error('Ошибка создания отчета с изображением:', error);
      alert('Ошибка при создании отчета с изображением');
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleGenerateTemplateReport(file);
  };

  const handleGenerateTemplateReport = async (templateFile: File) => {
    try {
      if (!chartRef.current) {
        alert('График не найден');
        return;
      }

      const reportData = createReportData();
      const processor = DocxTemplateProcessor.getInstance();
      
      const docxBlob = await processor.processTemplate(
        templateFile,
        reportData,
        chartRef.current
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(docxBlob);
      link.download = `template_report_${dataType}_${new Date().toISOString().split('T')[0]}.docx`;
      link.click();
    } catch (error) {
      console.error('Ошибка создания отчета по шаблону:', error);
      alert('Ошибка при создании отчета по шаблону');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных... {Math.round(progress)}%</p>
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

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Нет данных для анализа</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Вернуться назад
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <BarChart className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Анализ временных рядов</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowContractFields(!showContractFields)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Поля договора</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Настройки</span>
          </button>
        </div>
      </div>

      {/* Поля договора */}
      {showContractFields && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Поля договора</h3>
            <button
              onClick={addContractField}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Добавить поле</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contractFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateContractFieldLabel(field.id, e.target.value)}
                    className="text-sm font-medium text-gray-700 bg-transparent border-none p-0 focus:ring-0"
                  />
                  {field.id.startsWith('custom_') && (
                    <button
                      onClick={() => removeContractField(field.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {field.type === 'textarea' ? (
                  <textarea
                    value={field.value}
                    onChange={(e) => updateContractField(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => updateContractField(field.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Панель настроек */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки анализа</h3>
          
          {/* Выбор типа данных */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип данных</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setDataType('temperature')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dataType === 'temperature'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!data.hasTemperature}
              >
                Температура {!data.hasTemperature && '(недоступно)'}
              </button>
              <button
                onClick={() => setDataType('humidity')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dataType === 'humidity'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!data.hasHumidity}
              >
                Влажность {!data.hasHumidity && '(недоступно)'}
              </button>
            </div>
          </div>

          {/* Настройка лимитов */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Лимиты для {dataType === 'temperature' ? 'температуры (°C)' : 'влажности (%)'}
            </label>
            <div className="flex space-x-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Минимум</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits[dataType]?.min ?? ''}
                  onChange={(e) => handleLimitChange(dataType, 'min', e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Мин"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Максимум</label>
                <input
                  type="number"
                  step="0.1"
                  value={limits[dataType]?.max ?? ''}
                  onChange={(e) => handleLimitChange(dataType, 'max', e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Макс"
                />
              </div>
            </div>
          </div>

          {/* Управление маркерами */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Вертикальные маркеры</label>
            {markers.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {markers.map((marker) => (
                  <div key={marker.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    {editingMarker === marker.id ? (
                      <>
                        <input
                          type="text"
                          value={marker.label || ''}
                          onChange={(e) => handleMarkerUpdate(marker.id, { label: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Название маркера"
                        />
                        <input
                          type="color"
                          value={marker.color}
                          onChange={(e) => handleMarkerUpdate(marker.id, { color: e.target.value })}
                          className="w-8 h-8 border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => setEditingMarker(null)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: marker.color }}
                        />
                        <span className="flex-1 text-sm">{marker.label}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(marker.timestamp).toLocaleString('ru-RU')}
                        </span>
                        <button
                          onClick={() => setEditingMarker(marker.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMarkerDelete(marker.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Двойной клик по графику для добавления маркера</p>
            )}
          </div>
        </div>
      )}

      {/* График */}
      <div className="bg-white rounded-lg shadow p-6" ref={chartRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            График {dataType === 'temperature' ? 'температуры' : 'влажности'}
          </h3>
          <div className="flex items-center space-x-2">
            {zoomState && (
              <button
                onClick={handleZoomReset}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors flex items-center space-x-1"
              >
                <Zap className="w-3 h-3" />
                <span>Сбросить зум</span>
              </button>
            )}
            <span className="text-sm text-gray-500">
              Выделите область для увеличения • Двойной клик для маркера
            </span>
          </div>
        </div>
        
        <TimeSeriesChart
          data={data.points}
          width={1000}
          height={400}
          margin={{ top: 20, right: 50, bottom: 80, left: 60 }}
          dataType={dataType}
          limits={limits}
          markers={markers}
          zoomState={zoomState}
          onZoomChange={handleZoomChange}
          onMarkerAdd={handleMarkerAdd}
          yAxisLabel={dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'}
        />
      </div>

      {/* Таблица результатов */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Результаты анализа</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Экспорт CSV</span>
            </button>
            <button
              onClick={handleGenerateReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Стандартный отчет</span>
            </button>
            <button
              onClick={handleGenerateImageReport}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Отчет с PNG</span>
            </button>
            <button
              onClick={() => templateInputRef.current?.click()}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Отчет по шаблону</span>
            </button>
            <input
              ref={templateInputRef}
              type="file"
              accept=".docx"
              onChange={handleTemplateUpload}
              className="hidden"
            />
          </div>
        </div>

        {zoomState && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Период анализа:</strong> {new Date(zoomState.startTime).toLocaleString('ru-RU')} - {new Date(zoomState.endTime).toLocaleString('ru-RU')}
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № зоны
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Уровень (м.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Логгер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Серийный №
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Мин. {dataType === 'temperature' ? 't°C' : 'RH%'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Макс. {dataType === 'temperature' ? 't°C' : 'RH%'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Среднее {dataType === 'temperature' ? 't°C' : 'RH%'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Соответствие лимитам
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisResults.map((result, index) => (
                <tr key={result.fileId} className={result.isExternal ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.zoneNumber}
                    {result.isExternal && <span className="ml-1 text-xs text-gray-500">(Внешний)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.measurementLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.loggerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.serialNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.minTemp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.maxTemp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
      </div>
    </div>
  );
};