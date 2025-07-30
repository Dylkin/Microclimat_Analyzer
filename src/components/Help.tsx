import React, { useState } from 'react';
import { HelpCircle, FileText, Download, Info, BookOpen, Code, AlertTriangle, CheckCircle } from 'lucide-react';

export const Help: React.FC = () => {
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
        message: 'Инструкция по созданию шаблона скачана успешно!' 
      });
    } catch (error) {
      setDownloadStatus({ 
        type: 'error', 
        message: 'Ошибка при скачивании инструкции' 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center space-x-3">
        <HelpCircle className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Справка</h1>
      </div>

      {/* Статус скачивания */}
      {downloadStatus && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg ${
          downloadStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {downloadStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
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

      {/* Создание шаблонов отчетов */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Создание шаблонов отчетов</h2>
        </div>

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
                <li>Загрузите готовый шаблон в разделе "Визуализация данных"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Кнопка скачивания */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleDownloadTemplate}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Скачать инструкцию по созданию шаблона</span>
          </button>
        </div>

        {/* Список плейсхолдеров */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Поддерживаемые плейсхолдеры:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Основная информация:</h4>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{Report No.'}</code> - Номер отчета</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{Report date}'}</code> - Дата отчета</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{name of the object}'}</code> - Объект исследования</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{name of the air conditioning system}'}</code> - Климатическая установка</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{name of the test}'}</code> - Вид испытания</div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Результаты и данные:</h4>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{acceptance criteria}'}</code> - Критерии приемки</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{Results table}'}</code> - Таблица результатов</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{Result}'}</code> - Выводы и заключение</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{executor}'}</code> - Исполнитель</div>
              <div>• <code className="bg-gray-200 px-1 rounded">{'{director}'}</code> - Руководитель</div>
            </div>
          </div>
        </div>
      </div>

      {/* Руководство пользователя */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BookOpen className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Руководство пользователя</h2>
        </div>

        <div className="space-y-6">
          {/* Загрузка файлов */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">1. Загрузка файлов данных</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Поддерживаются файлы в формате <code className="bg-gray-200 px-1 rounded">.vi2</code></li>
                <li>• Можно загружать несколько файлов одновременно</li>
                <li>• Поддерживаются одноканальные (DL-019) и двухканальные (DL-221) логгеры</li>
                <li>• Файлы автоматически обрабатываются после загрузки</li>
                <li>• Можно изменить порядок файлов и добавить номера зон измерения</li>
              </ul>
            </div>
          </div>

          {/* Анализ данных */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">2. Анализ временных рядов</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Зум:</strong> Выделите область на графике для увеличения</li>
                <li>• <strong>Маркеры:</strong> Двойной клик для добавления вертикальных маркеров</li>
                <li>• <strong>Лимиты:</strong> Установите температурные и влажностные пороги</li>
                <li>• <strong>Переключение данных:</strong> Выбор между температурой и влажностью</li>
                <li>• <strong>Таблица результатов:</strong> Автоматический расчет статистики</li>
              </ul>
            </div>
          </div>

          {/* Генерация отчетов */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Генерация отчетов</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Создайте шаблон DOCX с плейсхолдерами</li>
                <li>• Загрузите шаблон в разделе "Визуализация данных"</li>
                <li>• Заполните информацию об исследовании</li>
                <li>• Проведите анализ данных и добавьте выводы</li>
                <li>• Сгенерируйте итоговый отчет в формате DOCX</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Технические требования */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Code className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Технические требования</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Поддерживаемые форматы</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Входные файлы:</strong> .vi2 (бинарные файлы логгеров)</li>
                <li>• <strong>Шаблоны:</strong> .docx (Microsoft Word)</li>
                <li>• <strong>Выходные отчеты:</strong> .docx</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Поддерживаемые устройства</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>DL-019:</strong> Одноканальный логгер температуры</li>
                <li>• <strong>DL-221:</strong> Двухканальный логгер (температура + влажность)</li>
                <li>• <strong>Testo 174T:</strong> Одноканальные логгеры</li>
                <li>• <strong>Testo 174H:</strong> Двухканальные логгеры</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Часто задаваемые вопросы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Часто задаваемые вопросы</h2>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-800">Почему файл не загружается?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Убедитесь, что файл имеет расширение .vi2 и является корректным файлом данных логгера.
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-800">Как создать шаблон отчета?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Скачайте инструкцию выше, создайте DOCX документ с плейсхолдерами и загрузите его в приложение.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-800">Как добавить маркеры на график?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Сделайте двойной клик по графику в нужном месте. Маркеры можно редактировать и удалять.
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="font-semibold text-gray-800">Что делать если отчет не генерируется?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Проверьте, что загружен корректный DOCX шаблон, заполнены все обязательные поля и добавлены выводы в анализаторе.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};