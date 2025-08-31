import React from 'react';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import { Project } from '../types/Project';
import { MicroclimatAnalyzer } from './MicroclimatAnalyzer';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  // Безопасная проверка данных проекта
  if (!project || !project.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <FileText className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки проекта</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">Данные проекта не найдены или повреждены</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Подготовка отчета</h1>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о проекте</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Название проекта</label>
            <p className="text-gray-900">{project.name || 'Не указано'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Контрагент</label>
            <p className="text-gray-900">{project.contractorName || 'Не указан'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Статус</label>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
              Подготовка отчета
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Объектов квалификации</label>
            <p className="text-gray-900">{project.qualificationObjects.length}</p>
          </div>
        </div>
      </div>

      {/* Microclimat Analyzer Component */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Анализ данных и формирование отчета</h2>
        <MicroclimatAnalyzer 
          selectedProject={{
            id: project.id,
            name: project.name,
            contractorId: project.contractorId,
            contractorName: project.contractorName || 'Неизвестный контрагент',
            qualificationObjects: project.qualificationObjects.map(obj => ({
              qualificationObjectId: obj.qualificationObjectId,
              qualificationObjectName: obj.qualificationObjectName || 'Без названия'
            })),
            status: project.status
          }}
        />
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по подготовке отчета:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Загрузите файлы данных:</strong> Добавьте файлы измерений в формате .vi2</li>
          <li>• <strong>Настройте параметры анализа:</strong> Установите лимиты температуры/влажности</li>
          <li>• <strong>Добавьте маркеры времени:</strong> Отметьте важные события на графике</li>
          <li>• <strong>Проанализируйте результаты:</strong> Изучите таблицу результатов анализа</li>
          <li>• <strong>Сформируйте отчет:</strong> Используйте шаблон DOCX для создания итогового отчета</li>
          <li>• <strong>Сохраните данные:</strong> Все данные автоматически сохраняются в рамках проекта</li>
        </ul>
      </div>
    </div>
  );
};