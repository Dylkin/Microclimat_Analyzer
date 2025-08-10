import React, { useState } from 'react';
import { HelpCircle, Info, BookOpen, Code, AlertTriangle } from 'lucide-react';

export const Help: React.FC = () => {

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center space-x-3">
        <HelpCircle className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Справка</h1>
      </div>

      {/* Руководство пользователя */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BookOpen className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Руководство пользователя</h2>
        </div>

        {/* Рекомендации по работе */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Рекомендации по работе</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="space-y-2">
                <h4 className="font-medium">Анализ данных:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Выделите область на графике для увеличения масштаба</li>
                  <li>Двойной клик для добавления временных маркеров</li>
                  <li>Установите лимиты для автоматической проверки соответствия</li>
                  <li>Переключайтесь между температурой и влажностью</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Генерация отчетов:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Экспортируйте данные в CSV формат</li>
                  <li>Сохраните графики как изображения</li>
                  <li>Используйте таблицу результатов для анализа</li>
                  <li>Создавайте отчеты в внешних программах</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Совет:</strong> При изменении масштаба графика таблица результатов автоматически обновляется, 
                показывая статистику только для выбранного временного периода. Используйте эту функцию для детального анализа отдельных периодов.
              </p>
            </div>
          </div>
        </div>

        {/* Рекомендации по температуре и влажности */}
        <div className="mb-8 space-y-6">
          {/* Рекомендации по температуре */}
          <div className="bg-red-50 border-red-200 border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">🌡️ Рекомендации по температуре</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm text-red-800">
                <h4 className="font-medium mb-2">Рекомендуемые нормы:</h4>
                <div className="space-y-1">
                  <div>• Холодильные камеры: +2°C до +8°C</div>
                  <div>• Морозильные камеры: -18°C до -25°C</div>
                  <div>• Фармацевтические склады: +15°C до +25°C</div>
                  <div>• Лаборатории: +18°C до +24°C</div>
                  <div>• Допустимые отклонения: ±2°C</div>
                </div>
              </div>
              <div className="text-sm text-red-800">
                <h4 className="font-medium mb-2">Критические показатели:</h4>
                <div className="space-y-1">
                  <div>⚠️ Разброс &gt;10°C - проблемы с климат-контролем</div>
                  <div>❄️ Температура &lt;-30°C - проверьте калибровку</div>
                  <div>🔥 Температура &gt;50°C - проблемы с охлаждением</div>
                  <div>📊 Резкие скачки - нестабильность системы</div>
                </div>
              </div>
            </div>
          </div>

          {/* Рекомендации по влажности */}
          <div className="bg-blue-50 border-blue-200 border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">💧 Рекомендации по влажности</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm text-blue-800">
                <h4 className="font-medium mb-2">Рекомендуемые нормы:</h4>
                <div className="space-y-1">
                  <div>• Фармацевтические склады: 45% - 65%</div>
                  <div>• Лаборатории: 40% - 60%</div>
                  <div>• Архивы и склады: 45% - 55%</div>
                  <div>• Производственные помещения: 40% - 70%</div>
                  <div>• Критично: избегать &gt;80% и &lt;30%</div>
                </div>
              </div>
              <div className="text-sm text-blue-800">
                <h4 className="font-medium mb-2">Критические показатели:</h4>
                <div className="space-y-1">
                  <div>💧 Влажность &gt;80% - риск конденсации и плесени</div>
                  <div>🏜️ Влажность &lt;20% - риск статического электричества</div>
                  <div>⚠️ Колебания &gt;40% - повреждение материалов</div>
                  <div>📈 Постоянный рост - проблемы вентиляции</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Список плейсхолдеров для DOCX шаблонов */}
        <div className="mb-8">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">📋 Плейсхолдеры для DOCX шаблонов</h3>
            <p className="text-purple-800 mb-4">
              При создании DOCX шаблона используйте следующие плейсхолдеры для автоматической вставки данных:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-purple-900">Основные данные:</h4>
                <ul className="space-y-1 text-purple-800">
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{executor}'}</code> - ФИО исполнителя</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{Report_No}'}</code> - Номер отчета</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{Report_start}'}</code> - Дата отчета</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{report_date}'}</code> - Дата отчета (альтернативный)</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{ObjectName}'}</code> - Наименование объекта</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{CoolingSystemName}'}</code> - Наименование холодильной установки</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-purple-900">Данные анализа:</h4>
                <ul className="space-y-1 text-purple-800">
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{TestType}'}</code> - Тип испытания</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{AcceptanceСriteria}'}</code> - Критерии приемки</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{ResultsTable}'}</code> - Таблица результатов анализа (DOCX XML формат)</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{Results_table}'}</code> - Таблица результатов (альтернативный)</li>
                  <li><code className="bg-purple-100 px-2 py-1 rounded">{'{results_table}'}</code> - Таблица результатов (текстовый формат)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-purple-900">Изображения:</h4>
              <ul className="space-y-1 text-purple-800">
                <li><code className="bg-purple-100 px-2 py-1 rounded">{'{%chart}'}</code> - График временных рядов (изображение)</li>
              </ul>
            </div>
            <div className="mt-4 p-3 bg-purple-100 rounded-lg">
              <p className="text-xs text-purple-700">
                <strong>Примечание:</strong> Для изображений используйте специальный синтаксис <code>{'{%chart}'}</code>. 
                Обратите внимание на русскую букву "С\" в плейсхолдере <code>{'{AcceptanceСriteria}'}</code>.
                Плейсхолдер <code>{'{ResultsTable}'}</code> вставляет полноценную DOCX таблицу с форматированием.
              </p>
            </div>
          </div>
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
                <li>• Загрузите DOCX шаблон с плейсхолдерами</li>
                <li>• Заполните форму с данными отчета</li>
                <li>• Система автоматически вставит таблицу результатов и график</li>
                <li>• График поворачивается на 90° против часовой стрелки</li>
                <li>• Готовый отчет сохраняется в формате DOCX</li>
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
                <li>• <strong>Экспорт данных:</strong> Таблица результатов, графики</li>
                <li>• <strong>Визуализация:</strong> Интерактивные графики временных рядов</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Поддерживаемые устройства</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
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
              Нажмите кнопку "Генерация отчета", загрузите DOCX шаблон с плейсхолдерами, заполните форму и нажмите "Сгенерировать отчет". Система автоматически заменит плейсхолдеры на актуальные данные и вставит график с таблицей результатов.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-800">Как добавить маркеры на график?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Сделайте двойной клик по графику в нужном месте. Маркеры можно редактировать и удалять.
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="font-semibold text-gray-800">Как создать отчет?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Используйте таблицу результатов анализа для создания отчетов во внешних программах. Данные можно скопировать и вставить в документы.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};