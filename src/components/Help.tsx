import React, { useState } from 'react';
import { HelpCircle, Info, BookOpen, Code, AlertTriangle } from 'lucide-react';

const Help: React.FC = () => {

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

          {/* Фильтрация данных по маркерам */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">2.1. Фильтрация данных по маркерам</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 mb-3">
                <strong>Применяется для типов испытаний:</strong>
              </p>
              <ul className="space-y-1 text-sm text-green-800 list-disc list-inside mb-4">
                <li>"Испытание на соответствие критериям в пустом объеме" (empty_volume)</li>
                <li>"Испытание на соответствие критериям в загруженном объеме" (loaded_volume)</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Логика фильтрации:</h4>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="bg-white rounded p-3 border-l-4 border-blue-500">
                    <p className="font-medium mb-1">1. Если маркеры типа 'test' не найдены:</p>
                    <p className="text-gray-600">Используются все данные, отображенные на графике (с учетом зума, если он применен)</p>
                  </div>
                  
                  <div className="bg-white rounded p-3 border-l-4 border-yellow-500">
                    <p className="font-medium mb-1">2. Если найден только один маркер типа 'test':</p>
                    <p className="text-gray-600">Используются все данные, отображенные на графике (с учетом зума, если он применен)</p>
                  </div>
                  
                  <div className="bg-white rounded p-3 border-l-4 border-green-500">
                    <p className="font-medium mb-1">3. Если найдены маркеры "Начало испытания" и "Завершение испытания":</p>
                    <ul className="text-gray-600 space-y-1 mt-1 ml-4 list-disc">
                      <li>Используются данные между этими маркерами (включительно)</li>
                      <li>Диапазон определяется автоматически: от "Начало испытания" до "Завершение испытания"</li>
                      <li>Если установлено несколько диапазонов — используются данные всех диапазонов (с учетом зума, если он применен)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded p-3 border-l-4 border-red-500">
                    <p className="font-medium mb-1">4. Исключение данных между маркерами "Открытие двери":</p>
                    <ul className="text-gray-600 space-y-1 mt-1 ml-4 list-disc">
                      <li>Если в диапазоне испытания есть маркеры "Открытие двери", данные между ними исключаются из диапазона</li>
                      <li>Исключаются только те диапазоны "Открытие двери", которые полностью находятся внутри диапазона испытания</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Технические детали:</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Поиск всех маркеров типа 'test' и формирование пар "Начало испытания" — "Завершение испытания"</li>
                  <li>Поддержка множественных диапазонов испытаний</li>
                  <li>Автоматическое исключение данных между парами маркеров "Открытие двери" внутри диапазонов испытаний</li>
                  <li>Добавлено логирование для отладки процесса фильтрации</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Генерация отчетов */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Генерация отчетов</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Стандартный отчет:</strong> Автоматически создается с таблицей результатов и графиком</li>
                <li>• <strong>Отчет с PNG графиком:</strong> Содержит высококачественное изображение графика</li>
                <li>• <strong>Отчет по шаблону:</strong> Использует загруженный DOCX шаблон с плейсхолдерами</li>
                <li>• График автоматически поворачивается на 90° против часовой стрелки</li>
                <li>• Все отчеты сохраняются в формате DOCX</li>
              </ul>
            </div>
          </div>

          {/* Работа с шаблонами */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Работа с пользовательскими шаблонами</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Создайте DOCX шаблон с плейсхолдером <code className="bg-gray-200 px-1 rounded">{'{chart}'}</code></li>
                <li>• График будет вставлен в место плейсхолдера в формате PNG</li>
                <li>• Изображение автоматически сохраняется в папке word/media</li>
                <li>• Поддерживаются дополнительные плейсхолдеры для данных анализа</li>
                <li>• Высокое разрешение изображения (scale: 2) для четкого отображения</li>
              </ul>
            </div>
            
            <div className="w-full max-w-2xl bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Как создать шаблон DOCX с изображением:
              </h4>
              <div className="text-xs text-blue-800 space-y-1">
                <div className="mb-3">
                  <p><strong>1. Создание шаблона:</strong></p>
                  <p>• Создайте DOCX файл в Microsoft Word или аналогичном редакторе</p>
                  <p>• В том месте, где должен быть график, вставьте текст: <code>{'{chart}'}</code></p>
                  <p>• Сохраните файл в формате DOCX</p>
                </div>
                <div className="mb-3">
                  <p><strong>2. Как работает вставка изображения:</strong></p>
                  <p>• Изображение автоматически сохраняется в папку <code>word/media/</code></p>
                  <p>• Создаются связи в файле <code>word/_rels/document.xml.rels</code></p>
                  <p>• Плейсхолдер <code>{'{chart}'}</code> заменяется на XML-структуру изображения</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p><strong>Основные:</strong></p>
                    <p>• <code>{'{chart}'}</code> - изображение графика (PNG)</p>
                    <p>• <code>{'{Table}'}</code> - таблица результатов анализа</p>
                    <p>• <code>{'{Result}'}</code> - текст выводов из поля "Выводы"</p>
                    <p>• <code>{'{Object}'}</code> - наименование объекта квалификации</p>
                    <p>• <code>{'{ConditioningSystem}'}</code> - климатическая установка</p>
                    <p>• <code>{'{System}'}</code> - климатическая установка (альтернативный)</p>
                    <p>• <code>{'{NameTest}'}</code> - тип испытания</p>
                    <p>• <code>{'{Position}'}</code> - должность исполнителя из справочника пользователей</p>
                    <p>• <code>{'{Size}'}</code> - только значение площади объекта (число)</p>
                  </div>
                  <div>
                    <p><strong>Дополнительные:</strong></p>
                    <p>• <code>{'{Limits}'}</code> - установленные лимиты с единицами измерения</p>
                    <p>• <code>{'{Executor}'}</code> - ФИО исполнителя (текущий пользователь)</p>
                    <p>• <code>{'{TestDate}'}</code> - дата испытания (текущая дата)</p>
                    <p>• <code>{'{ReportNo}'}</code> - номер договора из настроек анализа</p>
                    <p>• <code>{'{ReportDate}'}</code> - дата договора из настроек анализа</p>
                    <p>• <code>{'{title}'}</code> - заголовок отчета</p>
                    <p>• <code>{'{date}'}</code> - дата создания отчета</p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-100 rounded space-y-1">
                  <p className="text-xs"><strong>Важно:</strong> Плейсхолдер <code>{'{chart}'}</code> обязателен для корректной работы шаблона. Изображение будет вставлено с высоким разрешением и повернуто на 90° против часовой стрелки. Плейсхолдер <code>{'{resultsTable}'}</code> создает полную таблицу с результатами анализа.</p>
                  <p className="text-xs"><strong>Плейсхолдеры данных:</strong> <code>{'{Position}'}</code> подставляется из справочника пользователей (поле «Должность» текущего пользователя). <code>{'{Size}'}</code> — только значение площади объекта квалификации (без типа помещения и зон хранения).</p>
                </div>
              </div>
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
              Создайте DOCX файл с плейсхолдером {'{chart}'} в том месте, где должен быть график. Дополнительно можно использовать плейсхолдеры для данных: {'{title}'}, {'{date}'}, {'{totalSensors}'} и другие.
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
              Выберите один из трех вариантов: стандартный отчет, отчет с PNG графиком или отчет по пользовательскому шаблону. Все варианты создают готовые DOCX файлы.
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h3 className="font-semibold text-gray-800">Какие плейсхолдеры поддерживаются в шаблонах?</h3>
        <p className="text-sm text-gray-600 mt-1">
          Основные: {'{chart}'} (изображение), {'{Table}'} (таблица), {'{Result}'} (выводы), {'{Object}'} (наименование объекта квалификации), {'{NameTest}'} (тип испытания), {'{Position}'} (должность из справочника пользователей), {'{Size}'} (только значение площади объекта). Дополнительные: {'{Limits}'} (лимиты), {'{Executor}'} (исполнитель), {'{TestDate}'} (дата), {'{ReportNo}'} (номер договора), {'{ReportDate}'} (дата договора).
        </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;