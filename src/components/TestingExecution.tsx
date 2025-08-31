import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, AlertTriangle } from 'lucide-react';
import { Project } from '../types/Project';
import { useAuth } from '../contexts/AuthContext';
import { MicroclimatAnalyzer } from './MicroclimatAnalyzer';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
}

export const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [showAnalyzer, setShowAnalyzer] = useState(false);

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
          <Play className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки проекта</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">Данные проекта не найдены или повреждены</p>
        </div>
      </div>
    );
  }

  if (showAnalyzer) {
    return (
      <MicroclimatAnalyzer 
        showVisualization={false}
        onShowVisualization={() => {}}
        selectedProject={{
          id: project.id,
          name: project.name,
          contractorId: project.contractorId,
          contractorName: project.contractorName || 'Неизвестный контрагент',
          qualificationObjects: project.qualificationObjects,
          status: project.status
        }}
      />
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
        <Play className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Проведение испытаний</h1>
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
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              Проведение испытаний
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Дата создания</label>
            <p className="text-gray-900">
              {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ru-RU') : 'Не указана'}
            </p>
          </div>
        </div>
        {project.description && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Описание</label>
            <p className="text-gray-900">{project.description}</p>
          </div>
        )}
      </div>

      {/* Testing Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия по проведению испытаний</h3>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Анализ данных измерений</h4>
            <p className="text-sm text-gray-600 mb-4">
              Загрузите файлы данных логгеров и проведите анализ временных рядов
            </p>
            <button
              onClick={() => setShowAnalyzer(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Перейти к анализу данных</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Подготовка оборудования:</strong> Убедитесь, что все логгеры настроены и размещены согласно протоколу</li>
          <li>• <strong>Проведение измерений:</strong> Запустите процесс измерений согласно методике</li>
          <li>• <strong>Сбор данных:</strong> После завершения измерений выгрузите данные с логгеров</li>
          <li>• <strong>Анализ данных:</strong> Используйте анализатор для обработки файлов .vi2</li>
          <li>• <strong>Формирование отчета:</strong> Создайте отчет с результатами анализа</li>
        </ul>
      </div>
    </div>
  );
};