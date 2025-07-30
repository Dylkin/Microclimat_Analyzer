import React, { useState } from 'react';
import { Download, FileText, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface TemplateManagerProps {
  onTemplateSelect?: (file: File) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ onTemplateSelect }) => {
  const [downloadStatus, setDownloadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDownloadTemplate = () => {
    try {
      // Создаем базовый шаблон DOCX в виде текстового файла с инструкциями
      const templateContent = `ШАБЛОН ОТЧЕТА MICROCLIMAT ANALYZER

Этот файл содержит инструкции для создания шаблона отчета в формате DOCX.

ПЛЕЙСХОЛДЕРЫ ДЛЯ ЗАМЕНЫ:
Используйте следующие плейсхолдеры в вашем DOCX документе:

ОСНОВНАЯ ИНФОРМАЦИЯ:
{Report No.} - Номер отчета
{Report date} - Дата отчета
{name of the object} - Название объекта исследования
{name of the air conditioning system} - Название климатической установки
{name of the test} - Вид испытания

ВРЕМЕННЫЕ ДАННЫЕ:
{Date time of test start} - Дата и время начала испытания
{Date time of test completion} - Дата и время завершения испытания
{Duration of the test} - Длительность испытания

КРИТЕРИИ И РЕЗУЛЬТАТЫ:
{acceptance criteria} - Критерии приемки
{Results table} - Таблица результатов
{Result} - Выводы и заключение

ИСПОЛНИТЕЛИ:
{executor} - Исполнитель
{director} - Руководитель
{test date} - Дата проведения испытания

ГРАФИК:
{chart} - Место для вставки графика

ИНСТРУКЦИИ ПО СОЗДАНИЮ ШАБЛОНА:

1. Создайте новый документ в Microsoft Word
2. Оформите документ согласно вашим требованиям (логотип, заголовки, стили)
3. Вставьте плейсхолдеры в нужные места документа
4. Сохраните документ в формате .docx
5. Загрузите созданный шаблон в приложение

ПРИМЕР СТРУКТУРЫ ДОКУМЕНТА:

ОТЧЕТ № {Report No.}
от {Report date}

Объект исследования: {name of the object}
Климатическая установка: {name of the air conditioning system}
Вид испытания: {name of the test}

Критерии приемки:
{acceptance criteria}

Период испытания:
Начало: {Date time of test start}
Завершение: {Date time of test completion}
Длительность: {Duration of the test}

Результаты измерений:
{Results table}

График:
{chart}

Заключение:
{Result}

Исполнитель: {executor}
Руководитель: {director}
Дата: {test date}

ВАЖНО:
- Плейсхолдеры должны быть написаны точно как указано (с учетом регистра)
- Используйте фигурные скобки { } вокруг названий плейсхолдеров
- Сохраняйте документ только в формате .docx
`;

      // Создаем и скачиваем файл
      const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Инструкция_по_созданию_шаблона_отчета.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadStatus({ 
        type: 'success', 
        message: 'Инструкция по созданию шаблона скачана. Создайте DOCX файл согласно инструкции.' 
      });
    } catch (error) {
      setDownloadStatus({ 
        type: 'error', 
        message: 'Ошибка при скачивании инструкции' 
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Управление шаблонами</h3>
      </div>

      {/* Статус скачивания */}
      {downloadStatus && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg mb-4 ${
          downloadStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {downloadStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{downloadStatus.message}</span>
          <button 
            onClick={() => setDownloadStatus(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Как создать шаблон отчета:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Скачайте инструкцию с плейсхолдерами</li>
              <li>Создайте документ в Microsoft Word</li>
              <li>Оформите документ согласно вашим требованиям</li>
              <li>Вставьте плейсхолдеры в нужные места</li>
              <li>Сохраните в формате .docx</li>
              <li>Загрузите готовый шаблон в приложение</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Кнопка скачивания */}
      <div className="flex justify-center">
        <button
          onClick={handleDownloadTemplate}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Скачать инструкцию по созданию шаблона</span>
        </button>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Поддерживаемые плейсхолдеры:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
          <div>• <code className="bg-gray-200 px-1 rounded">{'{Report No.'}</code> - Номер отчета</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{Report date}'}</code> - Дата отчета</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{name of the object}'}</code> - Объект исследования</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{name of the test}'}</code> - Вид испытания</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{acceptance criteria}'}</code> - Критерии приемки</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{Results table}'}</code> - Таблица результатов</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{Result}'}</code> - Выводы</div>
          <div>• <code className="bg-gray-200 px-1 rounded">{'{executor}'}</code> - Исполнитель</div>
        </div>
      </div>
    </div>
  );
};