import React, { useState, useRef, useEffect } from 'react';
import { BarChart, FileText, Calendar, Building, Settings, Target, Download, ArrowLeft, TrendingUp, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { ReportGenerator } from '../utils/reportGenerator';
import { useAuth } from '../contexts/AuthContext';

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

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, onBack }) => {
  const [showTimeSeriesAnalyzer, setShowTimeSeriesAnalyzer] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { users, user } = useAuth();
  const [researchInfo, setResearchInfo] = useState<ResearchInfo>({
    reportNumber: '',
    reportDate: new Date().toISOString().split('T')[0],
    templateFile: null,
    objectName: '',
    climateSystemName: ''
  });

  const [testType, setTestType] = useState('empty-object');
  const researchInfoRef = useRef<HTMLDivElement>(null);

  const testTypes = [
    { value: 'empty-object', label: 'Соответствие критериям в пустом объекте' },
    { value: 'loaded-object', label: 'Соответствие критериям в загруженном объекте' },
    { value: 'door-opening', label: 'Открытие двери' },
    { value: 'power-off', label: 'Отключение электропитания' },
    { value: 'power-on', label: 'Включение электропитания' }
  ];

  useEffect(() => {
    // Автоматический фокус на блок информации для исследования
    setTimeout(() => {
      researchInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // Загружаем список сгенерированных отчетов
    const reportGenerator = ReportGenerator.getInstance();
    setGeneratedReports(reportGenerator.getGeneratedReports());
  }, []);

  // Если показываем анализатор временных рядов
  if (showTimeSeriesAnalyzer) {
    return <TimeSeriesAnalyzer files={files} onBack={() => setShowTimeSeriesAnalyzer(false)} />;
  }

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setResearchInfo(prev => ({ ...prev, templateFile: file }));
      setReportStatus(null);
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const handleGenerateReport = async () => {
    if (!isFormValid()) {
      setReportStatus({ type: 'error', message: 'Заполните все обязательные поля' });
      return;
    }

    setIsGeneratingReport(true);
    setReportStatus(null);

    try {
      const reportGenerator = ReportGenerator.getInstance();
      
      // Получаем руководителя из справочника пользователей
      const director = users.find(u => u.role === 'manager')?.fullName || 'Не назначен';
      
      // Подготавливаем данные для отчета
      const reportData = {
        reportNumber: researchInfo.reportNumber,
        reportDate: researchInfo.reportDate,
        objectName: researchInfo.objectName,
        climateSystemName: researchInfo.climateSystemName,
        testType,
        limits: {}, // Будет заполнено из анализатора
        markers: [], // Будет заполнено из анализатора
        resultsTableData: [], // Будет заполнено из анализатора
        conclusion: '', // Будет заполнено из анализатора
        user: user || { fullName: 'Текущий пользователь', email: '', id: '', role: 'specialist' as const },
        director
      };

      const result = await reportGenerator.generateReport(
        researchInfo.templateFile!,
        reportData
      );

      if (result.success) {
        setReportStatus({ type: 'success', message: `Отчет "${result.fileName}" успешно сгенерирован и скачан` });
        setGeneratedReports(reportGenerator.getGeneratedReports());
      } else {
        setReportStatus({ type: 'error', message: result.error || 'Ошибка генерации отчета' });
      }
    } catch (error) {
      setReportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDeleteReport = (fileName: string) => {
    if (confirm(`Вы уверены, что хотите удалить отчет "${fileName}"?`)) {
      const reportGenerator = ReportGenerator.getInstance();
      if (reportGenerator.deleteReport(fileName)) {
        setGeneratedReports(reportGenerator.getGeneratedReports());
        setReportStatus({ type: 'success', message: 'Отчет успешно удален' });
      }
    }
  };

  const handleDownloadReport = (fileName: string) => {
    const reportGenerator = ReportGenerator.getInstance();
    if (reportGenerator.downloadReport(fileName)) {
      setReportStatus({ type: 'success', message: 'Отчет скачан' });
    } else {
      setReportStatus({ type: 'error', message: 'Ошибка скачивания отчета' });
    }
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
          <span className="text-sm text-gray-500">({files.filter(f => f.parsingStatus === 'completed').length} файлов)</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к загрузке</span>
        </button>
      </div>

      {/* Статус генерации отчета */}
      {reportStatus && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg ${
          reportStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {reportStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{reportStatus.message}</span>
          <button 
            onClick={() => setReportStatus(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Информация для исследования */}
      <div ref={researchInfoRef} className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Информация для исследования</h2>
          <div className="text-sm text-gray-500">
            Инструкции по созданию шаблонов доступны в разделе "Справка"
          </div>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Вид испытания
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {testTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Кнопка генерации базового отчета */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Генерация базового отчета</h3>
              <p className="text-sm text-gray-600">
                {isFormValid() 
                  ? 'Все поля заполнены. Можно сгенерировать базовый отчет.' 
                  : 'Заполните обязательные поля для генерации отчета'
                }
              </p>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={!isFormValid() || isGeneratingReport}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGeneratingReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Генерация...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Сгенерировать отчет</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Быстрый доступ к анализатору временных рядов */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Анализатор временных рядов</h3>
              <p className="text-sm text-gray-600">Интерактивные графики с зумом, маркерами и лимитами</p>
            </div>
          </div>
          <button
            onClick={() => setShowTimeSeriesAnalyzer(true)}
            disabled={files.filter(f => f.parsingStatus === 'completed').length === 0}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Открыть анализатор</span>
          </button>
        </div>
      </div>

      {/* Список сгенерированных отчетов */}
      {generatedReports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Сгенерированные отчеты</h3>
          </div>
          
          <div className="space-y-3">
            {generatedReports.map((fileName, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">{fileName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadReport(fileName)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Скачать отчет"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteReport(fileName)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить отчет"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};