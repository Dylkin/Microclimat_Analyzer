import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, FileText } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject } from '../types/QualificationObject';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectService } from '../utils/projectService';
import { loggerDataService } from '../utils/loggerDataService';
import { qualificationWorkScheduleService, QualificationWorkStage } from '../utils/qualificationWorkScheduleService';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';

interface DataAnalysisProps {
  project: Project;
  analysisData?: {
    qualificationObjectId?: string;
    projectId?: string;
    project?: Project;
  };
  onBack: () => void;
}

const DataAnalysis: React.FC<DataAnalysisProps> = ({ project, analysisData, onBack }) => {
  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [selectedQualificationObject, setSelectedQualificationObject] = useState<QualificationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggerCount, setLoggerCount] = useState<number>(0);
  const [workScheduleStages, setWorkScheduleStages] = useState<QualificationWorkStage[]>([]);

  // Загрузка полной информации о проекте
  const loadFullProject = async () => {
    if (!projectService.isAvailable()) {
      setError('Сервис проектов недоступен');
      return;
    }

    console.log('DataAnalysis: received project:', project);
    console.log('DataAnalysis: received analysisData:', analysisData);
    console.log('DataAnalysis: project.id:', project?.id);

    // Пытаемся получить projectId из разных источников
    const projectId = project?.id || analysisData?.projectId || analysisData?.project?.id;
    console.log('DataAnalysis: using projectId:', projectId);

    if (!projectId) {
      console.error('DataAnalysis: projectId is undefined');
      setError('Не удалось получить ID проекта');
      return;
    }

    try {
      const fullProjectData = await projectService.getProjectById(projectId);
      setFullProject(fullProjectData);
      console.log('DataAnalysis: full project data loaded:', fullProjectData);
    } catch (error) {
      console.error('Ошибка загрузки полной информации о проекте:', error);
      setError(`Не удалось загрузить полную информацию о проекте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Загрузка данных контрагента
  const loadContractor = async () => {
    // Убрана проверка isAvailable - API клиент всегда доступен

    const currentProject = fullProject || project;
    console.log('DataAnalysis: project data:', currentProject);
    console.log('DataAnalysis: contractorId:', currentProject.contractorId);

    if (!currentProject.contractorId) {
      console.error('DataAnalysis: contractorId is undefined');
      setError('Не удалось получить ID контрагента из данных проекта');
      return;
    }

    try {
      const contractorData = await contractorService.getContractorById(currentProject.contractorId);
      setContractor(contractorData);
    } catch (error) {
      console.error('Ошибка загрузки контрагента:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  };

  // Загрузка конкретного объекта квалификации
  const loadSelectedQualificationObject = async () => {
    // Убрана проверка isAvailable - API клиент всегда доступен

    if (!analysisData?.qualificationObjectId) {
      setError('Не указан ID объекта квалификации для анализа');
      return;
    }

    try {
      const object = await qualificationObjectService.getQualificationObjectById(analysisData.qualificationObjectId);
      setSelectedQualificationObject(object);
    } catch (error) {
      console.error('Ошибка загрузки объекта квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  };

  // Загрузка количества логгеров для объекта квалификации
  const loadLoggerCount = async () => {
    if (!loggerDataService.isAvailable()) {
      console.warn('LoggerDataService не доступен');
      return;
    }

    if (!analysisData?.qualificationObjectId || !fullProject?.id) {
      console.warn('Недостаточно данных для загрузки количества логгеров');
      return;
    }

    try {
      const loggerData = await loggerDataService.getLoggerDataSummary(
        fullProject.id,
        analysisData.qualificationObjectId
      );
      
      console.log('DataAnalysis: Получены данные логгеров:', loggerData);
      console.log('DataAnalysis: Структура первой записи:', loggerData[0]);
      
      // Подсчитываем уникальные логгеры (по имени файла или серийному номеру)
      const uniqueLoggers = new Set();
      loggerData.forEach(logger => {
        // Используем имя файла как идентификатор логгера
        // В базе данных поле называется file_name, а не fileName
        if (logger.file_name) {
          uniqueLoggers.add(logger.file_name);
        }
      });
      
      setLoggerCount(uniqueLoggers.size);
      console.log('DataAnalysis: Загружено логгеров:', uniqueLoggers.size, 'из', loggerData.length, 'записей');
    } catch (error) {
      console.error('Ошибка загрузки количества логгеров:', error);
      // Не устанавливаем ошибку, так как это не критично для работы страницы
      setLoggerCount(0);
    }
  };

  // Загрузка этапов плана-графика квалификационных работ
  const loadWorkScheduleStages = async () => {
    if (!qualificationWorkScheduleService.isAvailable()) {
      console.warn('QualificationWorkScheduleService не доступен');
      return;
    }

    if (!analysisData?.qualificationObjectId || !fullProject?.id) {
      console.warn('Недостаточно данных для загрузки плана-графика');
      return;
    }

    try {
      const stages = await qualificationWorkScheduleService.getWorkSchedule(
        analysisData.qualificationObjectId,
        fullProject.id
      );
      
      // Фильтруем только этапы с заполненными датами
      const filledStages = stages.filter(stage => stage.startDate || stage.endDate);
      setWorkScheduleStages(filledStages);
      console.log('DataAnalysis: Загружено этапов плана-графика:', filledStages.length);
    } catch (error) {
      console.error('Ошибка загрузки плана-графика:', error);
      // Не устанавливаем ошибку, так как это не критично для работы страницы
      setWorkScheduleStages([]);
    }
  };

  // Загрузка данных при инициализации
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Сначала загружаем полную информацию о проекте
        await loadFullProject();
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setError('Ошибка загрузки данных для анализа');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [project?.id, analysisData?.projectId, analysisData?.project?.id]);

  // Загрузка контрагента и объекта квалификации после загрузки полной информации о проекте
  useEffect(() => {
    if (fullProject) {
      const loadAdditionalData = async () => {
        try {
          await Promise.all([
            loadContractor(),
            loadSelectedQualificationObject()
          ]);
        } catch (error) {
          console.error('Ошибка загрузки дополнительных данных:', error);
          setError('Ошибка загрузки дополнительных данных для анализа');
        }
      };

      loadAdditionalData();
    }
  }, [fullProject]);

  // Загрузка количества логгеров и плана-графика после загрузки объекта квалификации
  useEffect(() => {
    if (selectedQualificationObject && fullProject) {
      loadLoggerCount();
      loadWorkScheduleStages();
    }
  }, [selectedQualificationObject, fullProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Назад"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <BarChart3 className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки данных</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Если загружен объект квалификации, показываем анализатор временных рядов
  if (selectedQualificationObject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Назад"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Анализ данных: {selectedQualificationObject.name}</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Информация об объекте</h3>
          
          {/* Реквизиты договора */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-3">Реквизиты договора</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">№ договора:</span>
                <p className="text-gray-700">{fullProject?.contractNumber || 'Не указан'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-800">Дата договора:</span>
                <p className="text-gray-700">
                  {fullProject?.contractDate 
                    ? new Date(fullProject.contractDate).toLocaleDateString('ru-RU')
                    : 'Не указана'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Объект квалификации */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-3">Объект квалификации</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">Тип:</span>
                <p className="text-gray-700">{selectedQualificationObject.type}</p>
              </div>
              <div>
                <span className="font-medium text-gray-800">Наименование:</span>
                <p className="text-gray-700">{selectedQualificationObject.name || 'Без названия'}</p>
              </div>
              {selectedQualificationObject.manufacturer && (
                <div>
                  <span className="font-medium text-gray-800">Производитель:</span>
                  <p className="text-gray-700">{selectedQualificationObject.manufacturer}</p>
                </div>
              )}
            </div>
            
            {/* Поля в зависимости от типа объекта */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              {selectedQualificationObject.type === 'помещение' && (
                <>
                  {selectedQualificationObject.address && (
                    <div>
                      <span className="font-medium text-gray-800">Адрес:</span>
                      <p className="text-gray-700">{selectedQualificationObject.address}</p>
                    </div>
                  )}
                  {selectedQualificationObject.area !== undefined && selectedQualificationObject.area !== null && (
                    <div>
                      <span className="font-medium text-gray-800">Площадь (м²):</span>
                      <p className="text-gray-700">{selectedQualificationObject.area}</p>
                    </div>
                  )}
                  {selectedQualificationObject.climateSystem && (
                    <div>
                      <span className="font-medium text-gray-800">Климатическая система:</span>
                      <p className="text-gray-700">{selectedQualificationObject.climateSystem}</p>
                    </div>
                  )}
                </>
              )}
              
              {selectedQualificationObject.type === 'автомобиль' && (
                <>
                  {selectedQualificationObject.vin && (
                    <div>
                      <span className="font-medium text-gray-800">VIN номер:</span>
                      <p className="text-gray-700">{selectedQualificationObject.vin}</p>
                    </div>
                  )}
                  {selectedQualificationObject.registrationNumber && (
                    <div>
                      <span className="font-medium text-gray-800">Регистрационный номер:</span>
                      <p className="text-gray-700">{selectedQualificationObject.registrationNumber}</p>
                    </div>
                  )}
                  {selectedQualificationObject.bodyVolume !== undefined && selectedQualificationObject.bodyVolume !== null && (
                    <div>
                      <span className="font-medium text-gray-800">Объем кузова (м³):</span>
                      <p className="text-gray-700">{selectedQualificationObject.bodyVolume}</p>
                    </div>
                  )}
                </>
              )}
              
              {selectedQualificationObject.type === 'холодильная_камера' && (
                <>
                  {selectedQualificationObject.address && (
                    <div>
                      <span className="font-medium text-gray-800">Адрес:</span>
                      <p className="text-gray-700">{selectedQualificationObject.address}</p>
                    </div>
                  )}
                  {selectedQualificationObject.chamberVolume !== undefined && selectedQualificationObject.chamberVolume !== null && (
                    <div>
                      <span className="font-medium text-gray-800">Объем камеры (м³):</span>
                      <p className="text-gray-700">{selectedQualificationObject.chamberVolume}</p>
                    </div>
                  )}
                  {selectedQualificationObject.climateSystem && (
                    <div>
                      <span className="font-medium text-gray-800">Климатическая система:</span>
                      <p className="text-gray-700">{selectedQualificationObject.climateSystem}</p>
                    </div>
                  )}
                </>
              )}
              
              {(selectedQualificationObject.type === 'холодильник' || selectedQualificationObject.type === 'морозильник') && (
                <>
                  {selectedQualificationObject.inventoryNumber && (
                    <div>
                      <span className="font-medium text-gray-800">Инвентарный номер:</span>
                      <p className="text-gray-700">{selectedQualificationObject.inventoryNumber}</p>
                    </div>
                  )}
                  {selectedQualificationObject.serialNumber && (
                    <div>
                      <span className="font-medium text-gray-800">Серийный номер:</span>
                      <p className="text-gray-700">{selectedQualificationObject.serialNumber}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* План объекта */}
            {(selectedQualificationObject.planFileUrl || selectedQualificationObject.planFileName) && (
              <div className="mt-4">
                <span className="font-medium text-gray-800 block mb-2">План объекта:</span>
                <div className="flex items-center space-x-2">
                  {selectedQualificationObject.planFileUrl ? (
                    <a
                      href={selectedQualificationObject.planFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{selectedQualificationObject.planFileName || 'Открыть файл'}</span>
                    </a>
                  ) : (
                    <span className="text-gray-500">{selectedQualificationObject.planFileName || 'Файл не загружен'}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* План график проведения квалификационных работ */}
          {workScheduleStages.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-800 mb-3">План график проведения квалификационных работ</h4>
              <div className="space-y-2 text-sm">
                {workScheduleStages.map((stage) => {
                  const formatDate = (dateString?: string) => {
                    if (!dateString) return '';
                    try {
                      const date = new Date(dateString);
                      return date.toLocaleDateString('ru-RU');
                    } catch {
                      return dateString;
                    }
                  };

                  const startDate = formatDate(stage.startDate);
                  const endDate = formatDate(stage.endDate);
                  
                  let dateDisplay = '';
                  if (startDate && endDate) {
                    dateDisplay = `${startDate} - ${endDate}`;
                  } else if (startDate) {
                    dateDisplay = startDate;
                  } else if (endDate) {
                    dateDisplay = endDate;
                  }

                  return (
                    <div key={stage.id} className="text-gray-700">
                      <span className="font-medium">{stage.stageName}</span>
                      {dateDisplay && <span className="ml-2">– {dateDisplay}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Измерительное оборудование */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-3">Измерительное оборудование</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-800">Зона измерения:</span>
                <p className="text-gray-700">{selectedQualificationObject.measurementZones?.length || 0}</p>
              </div>
              <div>
                <span className="font-medium text-gray-800">Логгеров:</span>
                <p className="text-gray-700">{loggerCount}</p>
              </div>
            </div>
          </div>
        </div>

        <TimeSeriesAnalyzer 
          files={[]} // Будет загружено из базы данных
          qualificationObjectId={selectedQualificationObject.id}
          projectId={fullProject?.id || project.id}
        />
      </div>
    );
  }

  // Если данные еще не загружены, показываем сообщение
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Назад"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Анализ данных</h1>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Загрузка данных для анализа...</p>
      </div>
    </div>
  );
};

export default DataAnalysis;