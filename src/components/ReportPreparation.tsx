import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle, Building, Car, Refrigerator, Snowflake, MapPin, Eye, Download } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService, EquipmentPlacement } from '../utils/equipmentAssignmentService';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Equipment placement state
  const [equipmentPlacements, setEquipmentPlacements] = useState<Map<string, EquipmentPlacement>>(new Map());

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

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем объекты квалификации проекта
      if (qualificationObjectService.isAvailable()) {
        const allObjects = await qualificationObjectService.getQualificationObjectsByContractor(project.contractorId);
        const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
        const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
        setQualificationObjects(projectObjects);
        
        // Загружаем размещение оборудования для каждого объекта
        const placements = new Map<string, EquipmentPlacement>();
        for (const obj of projectObjects) {
          try {
            const placement = await equipmentAssignmentService.getEquipmentPlacement(project.id, obj.id);
            placements.set(obj.id, placement);
          } catch (error) {
            console.warn(`Не удалось загрузить размещение для объекта ${obj.id}:`, error);
            // Создаем пустое размещение
            placements.set(obj.id, { zones: [] });
          }
        }
        setEquipmentPlacements(placements);
      }

      // Загружаем доступное оборудование
      if (equipmentService.isAvailable()) {
        const equipmentResult = await equipmentService.getAllEquipment(1, 1000); // Загружаем все оборудование
        setEquipment(Array.isArray(equipmentResult?.equipment) ? equipmentResult.equipment : []);
      }

      // Загружаем документы проекта
      if (projectDocumentService.isAvailable()) {
        const docs = await projectDocumentService.getProjectDocuments(project.id);
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-5 h-5 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-5 h-5 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-5 h-5 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-5 h-5 text-indigo-600" />;
      default:
        return <Building className="w-5 h-5 text-gray-600" />;
    }
  };

  // Получение документов по типу и объекту
  const getDocumentsByTypeAndObject = (documentType: 'layout_scheme' | 'test_data', qualificationObjectId?: string) => {
    return documents.filter(doc => {
      const typeMatch = doc.documentType === documentType;
      const objectMatch = qualificationObjectId ? 
        doc.qualificationObjectId === qualificationObjectId :
        !doc.qualificationObjectId;
      
      return typeMatch && objectMatch;
    });
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных отчета...</p>
        </div>
      )}

      {/* Qualification Objects and Equipment Placement - Read Only */}
      {!loading && qualificationObjects.length > 0 && (
        <div className="space-y-6">
          {qualificationObjects.map((obj) => {
            const placement = equipmentPlacements.get(obj.id) || { zones: [] };
            
            return (
              <div key={obj.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(obj.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {QualificationObjectTypeLabels[obj.type]}
                        {obj.address && ` • ${obj.address}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Готово к отчету</span>
                  </div>
                </div>

                {/* Equipment Placement - Read Only */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Размещение оборудования</h4>

                  {placement.zones.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Размещение оборудования не настроено</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {placement.zones.map((zone) => (
                        <div key={zone.zoneNumber} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">Зона {zone.zoneNumber}</h5>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>

                          {zone.levels.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 bg-white rounded">
                              <p className="text-sm">Уровни не добавлены</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {zone.levels.map((level, levelIndex) => (
                                <div key={levelIndex} className="flex items-center space-x-3 bg-white p-3 rounded border">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Уровень:</span>
                                    <span className="font-medium">{level.levelValue} м</span>
                                  </div>

                                  <div className="flex-1">
                                    <span className="text-sm text-gray-900">
                                      {level.equipmentName ? 
                                        `${level.equipmentName} (${equipment.find(eq => eq.id === level.equipmentId)?.serialNumber || 'Unknown'})` : 
                                        'Оборудование не назначено'
                                      }
                                    </span>
                                  </div>

                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layout Scheme - Read Only */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Схема размещения</h4>
                  
                  {(() => {
                    const layoutDocs = documents.filter(doc => 
                      doc.documentType === 'layout_scheme' && 
                      doc.qualificationObjectId === obj.id
                    );
                    
                    return (
                      <div className="space-y-4">
                        {/* Отображение загруженных документов */}
                        {layoutDocs.length > 0 ? (
                          <div className="space-y-2">
                            {layoutDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center space-x-3">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <div>
                                    <p className="font-medium text-gray-900">{doc.fileName}</p>
                                    <p className="text-sm text-gray-500">
                                      Загружен {doc.uploadedAt.toLocaleDateString('ru-RU')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Просмотреть"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = doc.fileUrl;
                                      link.download = doc.fileName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="text-green-600 hover:text-green-800 transition-colors"
                                    title="Скачать"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500 bg-yellow-50 rounded-lg border border-yellow-200">
                            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <p className="text-sm">Схема размещения не загружена</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Test Data - Read Only */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Информация об испытаниях</h4>
                  
                  {(() => {
                    const testDataDocs = documents.filter(doc => 
                      doc.documentType === 'test_data' && 
                      doc.qualificationObjectId === obj.id
                    );
                    
                    return (
                      <div className="space-y-4">
                        {/* Отображение загруженных документов */}
                        {testDataDocs.length > 0 ? (
                          <div className="space-y-2">
                            {testDataDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center space-x-3">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <div>
                                    <p className="font-medium text-gray-900">{doc.fileName}</p>
                                    <p className="text-sm text-gray-500">
                                      Загружен {doc.uploadedAt.toLocaleDateString('ru-RU')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Просмотреть"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = doc.fileUrl;
                                      link.download = doc.fileName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="text-green-600 hover:text-green-800 transition-colors"
                                    title="Скачать"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500 bg-yellow-50 rounded-lg border border-yellow-200">
                            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <p className="text-sm">Информация об испытаниях не загружена</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус подготовки отчета</h3>
        
        <div className="space-y-4">
          {qualificationObjects.map((obj) => {
            const layoutDocs = getDocumentsByTypeAndObject('layout_scheme', obj.id);
            const testDataDocs = getDocumentsByTypeAndObject('test_data', obj.id);
            const placement = equipmentPlacements.get(obj.id) || { zones: [] };
            
            const hasPlacement = placement.zones.length > 0;
            const hasLayoutScheme = layoutDocs.length > 0;
            const hasTestData = testDataDocs.length > 0;
            const isComplete = hasPlacement && hasLayoutScheme && hasTestData;
            
            return (
              <div key={obj.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(obj.type)}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {QualificationObjectTypeLabels[obj.type]}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {hasPlacement ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm text-gray-600">Размещение</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasLayoutScheme ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm text-gray-600">Схема</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {hasTestData ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm text-gray-600">Данные</span>
                  </div>
                  
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isComplete 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isComplete ? 'Готово' : 'Не готово'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Этап подготовки отчета:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверка данных:</strong> Убедитесь, что все объекты квалификации имеют полные данные</li>
          <li>• <strong>Размещение оборудования:</strong> Проверьте корректность настройки зон и уровней</li>
          <li>• <strong>Схемы размещения:</strong> Убедитесь, что схемы загружены для всех объектов</li>
          <li>• <strong>Информация об испытаниях:</strong> Проверьте наличие всех необходимых файлов</li>
          <li>• <strong>Формирование отчета:</strong> После проверки данных можно переходить к формированию итогового отчета</li>
        </ul>
      </div>
    </div>
  );
};