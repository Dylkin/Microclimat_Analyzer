import React, { useState, useRef, useEffect } from 'react';
import { BarChart, FileText, Calendar, Building, Settings, Target, Clock, MessageSquare, Download, ArrowLeft, Droplets, Thermometer } from 'lucide-react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { InteractiveChart } from './InteractiveChart';
import { useMultiThreadDataLoader } from '../hooks/useMultiThreadDataLoader';

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
  const [temperatureLines, setTemperatureLines] = useState<VerticalLine[]>([]);
  const [humidityLines, setHumidityLines] = useState<VerticalLine[]>([]);
  const researchInfoRef = useRef<HTMLDivElement>(null);
  
  // Используем хук для многопоточной загрузки данных
  const { chartData, isLoading, loadingProgress, loadData, cleanup } = useMultiThreadDataLoader();

  const testTypes = [
    { value: 'empty-object', label: 'Соответствие критериям в пустом объекте' },
    { value: 'loaded-object', label: 'Соответствие критериям в загруженном объекте' },
    { value: 'door-opening', label: 'Открытие двери' },
    { value: 'power-off', label: 'Отключение электропитания' },
    { value: 'power-on', label: 'Включение электропитания' }
  ];

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData(files);
    
    // Автоматический фокус на блок информации для исследования
    setTimeout(() => {
      researchInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // Очистка воркеров при размонтировании
    return cleanup;
  }, [files, loadData, cleanup]);

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setResearchInfo(prev => ({ ...prev, templateFile: file }));
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  // Обработчики для температурных маркеров
  const handleAddTemperatureMarker = (timestamp: number) => {
    const newLine: VerticalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp,
      comment: ''
    };
    setTemperatureLines(prev => [...prev, newLine]);
  };

  const handleUpdateTemperatureMarker = (markerId: string, comment: string) => {
    setTemperatureLines(prev => prev.map(line => 
      line.id === markerId ? { ...line, comment } : line
    ));
  };

  const handleRemoveTemperatureMarker = (markerId: string) => {
    setTemperatureLines(prev => prev.filter(line => line.id !== markerId));
  };

  // Обработчики для маркеров влажности
  const handleAddHumidityMarker = (timestamp: number) => {
    const newLine: VerticalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp,
      comment: ''
    };
    setHumidityLines(prev => [...prev, newLine]);
  };

  const handleUpdateHumidityMarker = (markerId: string, comment: string) => {
    setHumidityLines(prev => prev.map(line => 
      line.id === markerId ? { ...line, comment } : line
    ));
  };

  const handleRemoveHumidityMarker = (markerId: string) => {
    setHumidityLines(prev => prev.filter(line => line.id !== markerId));
  };

  // Подготовка данных для графиков
  const getTemperatureData = () => {
    if (chartData.length === 0) {
      console.log('Нет данных для температурного графика');
      return [];
    }
    
    console.log(`Подготовка температурных данных: ${chartData.length} записей`);
    
    return chartData.map(d => ({
      timestamp: d.timestamp,
      value: d.temperature,
      formattedTime: d.formattedTime,
      fileId: d.fileId,
      fileName: d.fileName
    }));
  };

  const getHumidityData = () => {
    const humidityData = chartData.filter(d => d.humidity !== undefined && d.humidity !== null);
    
    if (humidityData.length === 0) {
      console.log('Нет данных влажности для графика');
      return [];
    }
    
    console.log(`Подготовка данных влажности: ${humidityData.length} записей`);
    
    return humidityData.map(d => ({
      timestamp: d.timestamp,
      value: d.humidity!,
      formattedTime: d.formattedTime,
      fileId: d.fileId,
      fileName: d.fileName
    }));
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
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="text-gray-600">Многопоточная загрузка данных...</span>
              </div>
              {loadingProgress.total > 0 && (
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">
                    Обработано файлов: {loadingProgress.completed} из {loadingProgress.total}
                  </div>
                  {loadingProgress.currentFile && (
                    <div className="text-xs text-gray-500">
                      Текущий файл: {loadingProgress.currentFile}
                    </div>
                  )}
                  <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(loadingProgress.completed / loadingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
          
          {/* График температуры */}
          {!isLoading && (
            <InteractiveChart
              data={getTemperatureData()}
              title="Температура"
              unit="°C"
              color="#ef4444"
              limits={temperatureLimits}
              markers={temperatureLines}
              onAddMarker={handleAddTemperatureMarker}
              onUpdateMarker={handleUpdateTemperatureMarker}
              onRemoveMarker={handleRemoveTemperatureMarker}
            />
          )}

          {/* График влажности */}
          {!isLoading && getHumidityData().length > 0 && (
            <InteractiveChart
              data={getHumidityData()}
              title="Влажность"
              unit="%"
              color="#3b82f6"
              limits={humidityLimits}
              markers={humidityLines}
              onAddMarker={handleAddHumidityMarker}
              onUpdateMarker={handleUpdateHumidityMarker}
              onRemoveMarker={handleRemoveHumidityMarker}
            />
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
              <span className="font-medium">Записей на графике:</span> {chartData.length.toLocaleString('ru-RU')}
            </div>
            <div>
              <span className="font-medium">Режим загрузки:</span> Многопоточный (до 4 воркеров)
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
              <span className="font-medium">Статус:</span> 
              <span className="ml-1">
                {isLoading ? 'Загрузка...' : (chartData.length > 0 ? 'Готов' : 'Нет данных')}
              </span>
            </div>
          </div>
          {chartData.length === 0 && !isLoading && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Данные не загружены. Проверьте, что файлы успешно обработаны и содержат корректные данные измерений. 
                Попробуйте перезагрузить страницу или проверить консоль браузера для диагностики.
              </p>
            </div>
          )}
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