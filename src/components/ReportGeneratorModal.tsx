import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { reportGenerator, ReportData } from '../utils/reportGenerator';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResults: any[];
  chartElement?: HTMLElement;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  analysisResults,
  chartElement
}) => {
  const [formData, setFormData] = useState({
    title: 'Анализ микроклимата',
    period: '',
    location: '',
    responsible: ''
  });
  
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.docx')) {
        setTemplateFile(file);
        setError(null);
        setSuccess('Шаблон загружен успешно');
      } else {
        setError('Пожалуйста, загрузите файл в формате .docx');
        setTemplateFile(null);
      }
    }
  };

  const handleGenerateReport = async () => {
    setError(null);
    setSuccess(null);

    // Валидация
    if (!formData.title.trim()) {
      setError('Название отчета обязательно');
      return;
    }

    if (!formData.period.trim()) {
      setError('Период исследования обязателен');
      return;
    }

    if (!formData.location.trim()) {
      setError('Место проведения обязательно');
      return;
    }

    if (!formData.responsible.trim()) {
      setError('Ответственный обязателен');
      return;
    }

    setIsGenerating(true);

    try {
      const reportData: ReportData = {
        title: formData.title.trim(),
        period: formData.period.trim(),
        location: formData.location.trim(),
        responsible: formData.responsible.trim(),
        analysisResults,
        chartElement
      };

      if (templateFile) {
        // Генерируем отчет из шаблона
        await reportGenerator.generateReportFromTemplate(templateFile, reportData);
        setSuccess('Отчет DOCX успешно сгенерирован из шаблона');
      } else {
        // Генерируем простой HTML отчет
        await reportGenerator.generateSimpleReport(reportData);
        setSuccess('Простой HTML отчет успешно сгенерирован');
      }

    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка при генерации отчета');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Генерация отчета</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Загрузка шаблона */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон DOCX (необязательно)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                {templateFile ? (
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{templateFile.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Загрузите DOCX шаблон с плейсхолдером {'{chart}'} для вставки графика
                    </p>
                  </div>
                )}
                <button
                  onClick={triggerFileUpload}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {templateFile ? 'Изменить шаблон' : 'Выбрать шаблон'}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleTemplateUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              Если шаблон не загружен, будет создан простой HTML отчет
            </p>
          </div>

          {/* Форма данных отчета */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название отчета *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Анализ микроклимата"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Период исследования *
              </label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="01.06.2025 - 07.06.2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Место проведения *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Склад №1, г. Москва"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ответственный *
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => handleInputChange('responsible', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Иванов И.И."
                required
              />
            </div>
          </div>

          {/* Сообщения об ошибках и успехе */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Информация о содержимом отчета */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Содержимое отчета:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Таблица результатов анализа ({analysisResults.length} записей)</li>
              <li>• График временных рядов (повернутый на 90° против часовой стрелки)</li>
              <li>• Метаданные: период, место, ответственный, дата генерации</li>
              {templateFile && <li>• Использование пользовательского DOCX шаблона</li>}
            </ul>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
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
  );
};