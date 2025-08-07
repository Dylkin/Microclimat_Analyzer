import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { reportSchema, ReportFormData } from '../schemas/reportSchema';

interface ReportFormProps {
  onSubmit: (data: ReportFormData, templateFile: File) => void;
  isGenerating: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({ onSubmit, isGenerating }) => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const templateInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date().toLocaleDateString('ru-RU'),
      testDate: new Date().toLocaleDateString('ru-RU'),
    },
  });

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setTemplateFile(file);
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const handleFormSubmit = (data: ReportFormData) => {
    if (!templateFile) {
      alert('Пожалуйста, загрузите шаблон отчета');
      return;
    }
    onSubmit(data, templateFile);
  };

  const triggerTemplateUpload = () => {
    templateInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Генерация отчета</h3>

      {/* Загрузка шаблона */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Шаблон отчета (DOCX)
        </label>
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={triggerTemplateUpload}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Загрузить шаблон</span>
          </button>
          {templateFile && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <FileText className="w-4 h-4" />
              <span>{templateFile.name}</span>
            </div>
          )}
        </div>
        <input
          ref={templateInputRef}
          type="file"
          accept=".docx"
          onChange={handleTemplateUpload}
          className="hidden"
        />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Основная информация */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Основная информация</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Номер отчета *
              </label>
              <input
                {...register('reportNo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите номер отчета"
              />
              {errors.reportNo && (
                <p className="mt-1 text-sm text-red-600">{errors.reportNo.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата отчета *
              </label>
              <input
                {...register('reportDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.reportDate && (
                <p className="mt-1 text-sm text-red-600">{errors.reportDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название объекта *
              </label>
              <input
                {...register('nameOfObject')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите название объекта"
              />
              {errors.nameOfObject && (
                <p className="mt-1 text-sm text-red-600">{errors.nameOfObject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Климатическая установка *
              </label>
              <input
                {...register('nameOfAirConditioningSystem')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите название установки"
              />
              {errors.nameOfAirConditioningSystem && (
                <p className="mt-1 text-sm text-red-600">{errors.nameOfAirConditioningSystem.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вид испытания *
              </label>
              <input
                {...register('nameOfTest')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите вид испытания"
              />
              {errors.nameOfTest && (
                <p className="mt-1 text-sm text-red-600">{errors.nameOfTest.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Временные данные */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Временные данные</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата и время начала *
              </label>
              <input
                {...register('dateTimeOfTestStart')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.dateTimeOfTestStart && (
                <p className="mt-1 text-sm text-red-600">{errors.dateTimeOfTestStart.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата и время завершения *
              </label>
              <input
                {...register('dateTimeOfTestCompletion')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.dateTimeOfTestCompletion && (
                <p className="mt-1 text-sm text-red-600">{errors.dateTimeOfTestCompletion.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длительность испытания *
              </label>
              <input
                {...register('durationOfTest')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Например: 24 часа"
              />
              {errors.durationOfTest && (
                <p className="mt-1 text-sm text-red-600">{errors.durationOfTest.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Критерии и результаты */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Критерии и результаты</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Критерии приемки *
              </label>
              <textarea
                {...register('acceptanceCriteria')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите критерии приемки"
              />
              {errors.acceptanceCriteria && (
                <p className="mt-1 text-sm text-red-600">{errors.acceptanceCriteria.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Выводы и заключение *
              </label>
              <textarea
                {...register('result')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите выводы и заключение"
              />
              {errors.result && (
                <p className="mt-1 text-sm text-red-600">{errors.result.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Исполнители */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Исполнители</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Исполнитель *
              </label>
              <input
                {...register('executor')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ФИО исполнителя"
              />
              {errors.executor && (
                <p className="mt-1 text-sm text-red-600">{errors.executor.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Руководитель *
              </label>
              <input
                {...register('director')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="ФИО руководителя"
              />
              {errors.director && (
                <p className="mt-1 text-sm text-red-600">{errors.director.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата проведения испытания *
              </label>
              <input
                {...register('testDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.testDate && (
                <p className="mt-1 text-sm text-red-600">{errors.testDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Кнопка генерации */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || !templateFile}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
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
      </form>
    </div>
  );
};