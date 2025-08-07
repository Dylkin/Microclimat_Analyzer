import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Download } from 'lucide-react';
import { ReportGenerator, ReportData } from '../utils/reportGenerator';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartElement: HTMLElement | null;
  analysisResults: Array<{
    zoneNumber: string | number;
    measurementLevel: string;
    loggerName: string;
    serialNumber: string;
    minTemp: string | number;
    maxTemp: string | number;
    avgTemp: string | number;
    meetsLimits: string;
  }>;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  chartElement,
  analysisResults
}) => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    period: '',
    location: '',
    responsible: ''
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.docx')) {
        setTemplateFile(file);
        setError('');
      } else {
        setError('Пожалуйста, выберите файл в формате DOCX');
        setTemplateFile(null);
      }
    }
  };

  const handleGenerateReport = async () => {
    setError('');
    
    // Валидация формы
    if (!formData.title || !formData.period || !formData.location || !formData.responsible) {
      setError('Все поля формы обязательны для заполнения');
      return;
    }

    if (!chartElement) {
      setError('График не найден');
      return;
    }

    setIsGenerating(true);

    try {
      const reportGenerator = new ReportGenerator();
      
      const reportData: ReportData = {
        title: formData.title,
        period: formData.period,
        location: formData.location,
        responsible: formData.responsible,
        analysisResults
      };

      await reportGenerator.generateReportFromTemplate(
        chartElement,
        reportData,
        templateFile || undefined
      );

      // Закрываем модальное окно после успешной генерации
      onClose();
      
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      setError(`Ошибка генерации отчета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          {/* Загрузка шаблона */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон DOCX (необязательно)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center">
                {templateFile ? (
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">{templateFile.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Загрузите DOCX шаблон с плейсхолдерами
                    </p>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {templateFile ? 'Изменить файл' : 'Выбрать файл'}
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p><strong>Поддерживаемые плейсхолдеры:</strong></p>
              <p>• <code>{'{title}'}</code> - заголовок отчета</p>
              <p>• <code>{'{period}'}</code> - период измерений</p>
              <p>• <code>{'{location}'}</code> - местоположение</p>
              <p>• <code>{'{responsible}'}</code> - ответственный</p>
              <p>• <code>{'{chart}'}</code> - график (повернутый на 90° против часовой стрелки)</p>
              <p>• <code>{'{analysisResults}'}</code> - таблица результатов анализа</p>
            </div>
          </div>

          {/* Форма данных отчета */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок отчета *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Отчет по микроклимату"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Период измерений *
              </label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="01.01.2024 - 31.01.2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Местоположение *
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

            <div>
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

          {/* Информация о данных */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Информация о данных:</h3>
            <div className="text-sm text-blue-800">
              <p>• Количество файлов в анализе: {analysisResults.length}</p>
              <p>• График будет повернут на 90° против часовой стрелки</p>
              <p>• Размеры и пропорции изображения будут сохранены</p>
              <p>• Таблица результатов будет включена автоматически</p>
            </div>
          </div>

          {/* Ошибки */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Кнопки */}
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