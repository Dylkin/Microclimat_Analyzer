import React, { useState, useRef } from 'react';
import { X, FileText, Download, Upload, AlertCircle, Image } from 'lucide-react';
import { ReportGenerator, ReportData } from '../utils/reportGenerator';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResults: Array<{
    zoneNumber: string | number;
    measurementLevel: string;
    loggerName: string;
    serialNumber: string;
    minTemp: string | number;
    maxTemp: string | number;
    avgTemp: string | number;
    minHumidity?: string | number;
    maxHumidity?: string | number;
    avgHumidity?: string | number;
    meetsLimits: string;
  }>;
  chartElement?: HTMLElement | null;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  analysisResults,
  chartElement
}) => {
  const [formData, setFormData] = useState({
    title: 'Отчет по микроклиматическому мониторингу',
    period: '',
    location: '',
    responsible: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setTemplateFile(file);
      setError(null);
    } else {
      setError('Пожалуйста, выберите файл в формате DOCX');
    }
  };

  const handleGenerateReport = async () => {
    if (!formData.title || !formData.period || !formData.location || !formData.responsible) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let chartImageBase64: string | undefined;

      // Захватываем график если он доступен
      if (chartElement) {
        try {
          chartImageBase64 = await ReportGenerator.captureChartAsImage(chartElement);
        } catch (chartError) {
          console.warn('Не удалось захватить график:', chartError);
          // Продолжаем без графика
        }
      }

      const reportData: ReportData = {
        title: formData.title,
        period: formData.period,
        location: formData.location,
        responsible: formData.responsible,
        analysisResults,
        chartImageBase64,
      };

      // Генерируем отчет
      const blob = await ReportGenerator.generateReport(reportData);

      // Сохраняем файл
      const filename = `${formData.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      ReportGenerator.saveFile(blob, filename);

      // Закрываем модальное окно
      onClose();
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка при генерации отчета');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveChartImage = async () => {
    if (!chartElement) {
      setError('График недоступен для сохранения');
      return;
    }

    setIsSavingImage(true);
    setError(null);

    try {
      await ReportGenerator.saveRotatedChartImage(chartElement, formData.title);
    } catch (error) {
      console.error('Ошибка сохранения изображения:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка при сохранении изображения');
    } finally {
      setIsSavingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Генерация отчета DOCX</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Форма данных отчета */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Данные отчета</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название отчета *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Отчет по микроклиматическому мониторингу"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Период исследования *
              </label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="01.06.2025 - 07.06.2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Место проведения *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Склад №1, г. Москва"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ответственный *
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => handleInputChange('responsible', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Иванов И.И."
              />
            </div>
          </div>

          {/* Информация о содержимом отчета */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Содержимое отчета:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Таблица результатов анализа ({analysisResults.length} записей)</li>
              {chartElement && <li>• График временных рядов (повернут на 90° против часовой стрелки)</li>}
              <li>• Информация о периоде и месте проведения исследования</li>
              <li>• Дата и время генерации отчета</li>
            </ul>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isGenerating || isSavingImage}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            {chartElement && (
              <button
                onClick={handleSaveChartImage}
                disabled={isSavingImage || isGenerating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    <span>Сохранить график</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || isSavingImage}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Генерация...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Сгенерировать отчет</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};