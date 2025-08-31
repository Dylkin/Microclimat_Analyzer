import React from 'react';
import { ArrowLeft, FileText, AlertTriangle, FolderOpen } from 'lucide-react';
import { Project } from '../types/Project';
import { MicroclimatAnalyzer } from './MicroclimatAnalyzer';
import { uploadedFileService } from '../utils/uploadedFileService';
import { useAuth } from '../contexts/AuthContext';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [selectedQualificationObjectId, setSelectedQualificationObjectId] = React.useState<string>('');
  const [objectFiles, setObjectFiles] = React.useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const [filesError, setFilesError] = React.useState<string | null>(null);

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

  // Загрузка файлов для выбранного объекта квалификации
  const loadObjectFiles = async (qualificationObjectId: string) => {
    if (!uploadedFileService.isAvailable() || !user?.id) {
      setFilesError('Сервис файлов недоступен или пользователь не авторизован');
      return;
    }

    setLoadingFiles(true);
    setFilesError(null);

    try {
      console.log('Загружаем файлы для объекта квалификации:', qualificationObjectId);
      
      // Загружаем все файлы пользователя
      const allFiles = await uploadedFileService.getProjectFiles(project.id, user.id);
      console.log('Все файлы пользователя:', allFiles);
      
      // Фильтруем файлы по объекту квалификации
      // Поскольку в базе данных uploaded_files нет прямой связи с qualification_object_id,
      // мы будем использовать логику сопоставления по названию или другим критериям
      
      // Пока загружаем все файлы проекта - в будущем можно добавить более точную фильтрацию
      setObjectFiles(allFiles);
      
      console.log(`Загружено файлов для объекта ${qualificationObjectId}:`, allFiles.length);
    } catch (error) {
      console.error('Ошибка загрузки файлов объекта:', error);
      setFilesError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      setObjectFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Обработчик изменения выбранного объекта квалификации
  const handleQualificationObjectChange = (objectId: string) => {
    setSelectedQualificationObjectId(objectId);
    if (objectId) {
      loadObjectFiles(objectId);
    } else {
      setObjectFiles([]);
      setFilesError(null);
    }
  };

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

      {/* Выбор объекта квалификации */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Выбор объекта квалификации</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Объект квалификации (из проекта)
            </label>
            <select
              value={selectedQualificationObjectId}
              onChange={(e) => handleQualificationObjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Выберите объект квалификации</option>
              {project.qualificationObjects.map(obj => (
                <option key={obj.qualificationObjectId} value={obj.qualificationObjectId}>
                  {obj.qualificationObjectName || 'Без названия'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Таблица файлов выбранного объекта */}
        {selectedQualificationObjectId && (
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">
              Файлы объекта: {project.qualificationObjects.find(obj => obj.qualificationObjectId === selectedQualificationObjectId)?.qualificationObjectName || 'Без названия'}
            </h3>
            
            {loadingFiles && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">Загрузка файлов...</p>
              </div>
            )}

            {filesError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Ошибка загрузки файлов</h4>
                    <p className="text-sm text-red-700 mt-1">{filesError}</p>
                  </div>
                </div>
              </div>
            )}

            {!loadingFiles && !filesError && objectFiles.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Файлы для выбранного объекта не найдены</p>
                <p className="text-sm mt-1">Загрузите файлы через Microclimat Analyzer</p>
              </div>
            )}

            {!loadingFiles && objectFiles.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Имя файла
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        № зоны измерения
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Уровень измерения (м.)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Период данных
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Количество записей
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {objectFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">{file.uploadDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {file.zoneNumber === 999 ? 'Внешний' : (file.zoneNumber || '-')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {file.measurementLevel || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {file.period || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {file.recordCount ? file.recordCount.toLocaleString('ru-RU') : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
          selectedQualificationObjectId={selectedQualificationObjectId}
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