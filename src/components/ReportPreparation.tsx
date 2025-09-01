import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle, Building, Car, Refrigerator, Snowflake, MapPin, Eye, Download, BarChart3, Upload, Trash2, Save } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { UploadedFile } from '../types/FileData';
import { QualificationObjectType } from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService, EquipmentPlacement } from '../utils/equipmentAssignmentService';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { uploadedFileService } from '../utils/uploadedFileService';
import { databaseService } from '../utils/database';
import { VI2ParsingService } from '../utils/vi2Parser';
import { useAuth } from '../contexts/AuthContext';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Equipment placement state
  const [equipmentPlacements, setEquipmentPlacements] = useState<Map<string, EquipmentPlacement>>(new Map());

  // Data analysis state
  const [selectedQualificationObject, setSelectedQualificationObject] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileUploading, setFileUploading] = useState<{ [key: string]: boolean }>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
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

  // Загрузка файлов для выбранного объекта квалификации
  const loadFilesForObject = async (qualificationObjectId: string) => {
    if (!user?.id || !uploadedFileService.isAvailable()) {
      return;
    }

    setAnalysisLoading(true);
    try {
      const files = await uploadedFileService.getProjectFiles(project.id, user.id, qualificationObjectId);
      setUploadedFiles(Array.isArray(files) ? files : []);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      setUploadedFiles([]);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Обработчик выбора объекта квалификации
  const handleQualificationObjectChange = (objectId: string) => {
    setSelectedQualificationObject(objectId);
    if (objectId) {
      loadFilesForObject(objectId);
    } else {
      setUploadedFiles([]);
    }
  };

  // Загрузка VI2 файла
  const handleFileUpload = async (assignment: any, file: File) => {
    if (!file.name.toLowerCase().endsWith('.vi2')) {
      alert('Поддерживаются только файлы в формате .vi2');
      return;
    }

    setFileUploading(prev => ({ ...prev, [assignment.id]: true }));

    try {
      // Парсим файл
      const vi2Parser = new VI2ParsingService();
      const parsedData = await vi2Parser.parseFile(file);

      // Создаем объект UploadedFile
      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        uploadDate: new Date().toLocaleString('ru-RU'),
        parsedData,
        parsingStatus: parsedData.parsingStatus,
        errorMessage: parsedData.errorMessage,
        recordCount: parsedData.recordCount,
        period: `${parsedData.startDate.toLocaleDateString('ru-RU')} - ${parsedData.endDate.toLocaleDateString('ru-RU')}`,
        order: uploadedFiles.length,
        qualificationObjectId: selectedQualificationObject,
        zoneNumber: assignment.zoneNumber,
        measurementLevel: assignment.measurementLevel.toString()
      };

      // Сохраняем данные в локальную базу
      if (parsedData.parsingStatus === 'completed') {
        await databaseService.saveParsedFileData(parsedData, uploadedFile.id);
      }

      // Обновляем список файлов
      setUploadedFiles(prev => [...prev, uploadedFile]);

    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert(`Ошибка загрузки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setFileUploading(prev => ({ ...prev, [assignment.id]: false }));
    }
  };

  // Удаление файла
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      await databaseService.deleteFileData(fileId);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert(`Ошибка удаления файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Сохранение файлов в базу данных
  const handleSaveFilesToDatabase = async () => {
    if (!user?.id || !selectedQualificationObject || uploadedFiles.length === 0) {
      alert('Нет данных для сохранения');
      return;
    }

    setOperationLoading(true);
    try {
      // Получаем тип объекта квалификации
      const selectedObject = qualificationObjects.find(obj => obj.id === selectedQualificationObject);
      if (!selectedObject) {
        throw new Error('Выбранный объект квалификации не найден');
      }

      // Подготавливаем данные для сохранения
      const saveData = {
        projectId: project.id,
        qualificationObjectId: selectedQualificationObject,
        objectType: selectedObject.type as QualificationObjectType,
        files: uploadedFiles
      };

      // Сохраняем файлы в базу данных
      await uploadedFileService.saveProjectFiles(saveData, user.id);
      
      alert('Файлы успешно сохранены в базу данных');
    } catch (error) {
      console.error('Ошибка сохранения файлов:', error);
      alert(`Ошибка сохранения файлов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение назначений оборудования для выбранного объекта
  const getEquipmentAssignments = () => {
    if (!selectedQualificationObject) return [];

    const placement = equipmentPlacements.get(selectedQualificationObject) || { zones: [] };
    const assignments: any[] = [];

    const zones = Array.isArray(placement?.zones) ? placement.zones : [];
    zones.forEach(zone => {
      const levels = Array.isArray(zone?.levels) ? zone.levels : [];
      levels.forEach(level => {
        if (level?.equipmentId) {
          const equipmentItem = (equipment || []).find(eq => eq.id === level.equipmentId);
          assignments.push({
            id: `${zone.zoneNumber}-${level.levelValue}`,
            zoneNumber: zone.zoneNumber,
            measurementLevel: level.levelValue,
            equipmentId: level.equipmentId,
            equipmentName: level.equipmentName || equipmentItem?.name || 'Unknown'
          });
        }
      });
    });

    return assignments.sort((a, b) => {
      if (a.zoneNumber !== b.zoneNumber) {
        return a.zoneNumber - b.zoneNumber;
      }
      return a.measurementLevel - b.measurementLevel;
    });
  };

  // Получение файла для назначения
  const getFileForAssignment = (assignmentId: string) => {
    // Ищем файл по соответствию зоны и уровня
    const assignment = getEquipmentAssignments().find(a => a.id === assignmentId);
    if (!assignment) return undefined;
    
    return uploadedFiles.find(file => 
      file.zoneNumber === assignment.zoneNumber && 
      file.measurementLevel === assignment.measurementLevel.toString()
    );
  };

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

      {/* Data Analysis Block */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Анализ данных</h3>
        </div>

        {/* Qualification Object Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите объект квалификации для анализа
          </label>
          <select
            value={selectedQualificationObject}
            onChange={(e) => handleQualificationObjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Выберите объект квалификации</option>
            {qualificationObjects.map(obj => (
              <option key={obj.id} value={obj.id}>
                {obj.name || obj.vin || obj.serialNumber || 'Без названия'} - {QualificationObjectTypeLabels[obj.type]}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment Assignments Table */}
        {selectedQualificationObject && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Назначения оборудования и загрузка данных</h4>
            
            {analysisLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка данных...</p>
              </div>
            ) : (
              <>
                {getEquipmentAssignments().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            № зоны
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Уровень (м)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                            Оборудование
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Файл
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Статус
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Файл данных (.vi2)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getEquipmentAssignments().map((assignment) => {
                          const assignmentFile = getFileForAssignment(assignment.id);
                          const isUploading = fileUploading[assignment.id];
                          
                          return (
                            <tr key={assignment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                {assignment.zoneNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                                {assignment.measurementLevel}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                                <div>
                                  <div className="font-medium">{assignment.equipmentName}</div>
                                  <div className="text-xs text-gray-400">ID: {assignment.equipmentId}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {assignmentFile ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{assignmentFile.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Не загружен</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {assignmentFile ? (
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      {assignmentFile.uploadDate}
                                    </div>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      assignmentFile.parsingStatus === 'completed' 
                                        ? 'bg-green-100 text-green-800' 
                                        : assignmentFile.parsingStatus === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {assignmentFile.parsingStatus === 'completed' ? 'Обработан' :
                                       assignmentFile.parsingStatus === 'error' ? 'Ошибка' :
                                       assignmentFile.parsingStatus === 'processing' ? 'Обработка' : 'Ожидание'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {assignmentFile ? (
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                      {assignmentFile.recordCount} записей • {assignmentFile.period}
                                    </div>
                                    <button
                                      onClick={() => handleDeleteFile(assignmentFile.id)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Удалить файл"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    {isUploading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                        <span className="text-indigo-600">Загрузка...</span>
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          type="file"
                                          accept=".vi2"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleFileUpload(assignment, file);
                                            }
                                          }}
                                          className="hidden"
                                          id={`file-upload-${assignment.id}`}
                                        />
                                        <label
                                          htmlFor={`file-upload-${assignment.id}`}
                                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors cursor-pointer"
                                        >
                                          <Upload className="w-3 h-3 mr-1" />
                                          Загрузить
                                        </label>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Назначения оборудования не настроены для выбранного объекта</p>
                    <p className="text-sm mt-1">Настройте размещение оборудования на этапе "Проведение испытаний"</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Files Summary */}
        {selectedQualificationObject && uploadedFiles.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Сводка по загруженным файлам:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">Всего файлов: {uploadedFiles.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-blue-800">
                  Обработано: {uploadedFiles.filter(f => f.parsingStatus === 'completed').length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-blue-800">
                  Ошибок: {uploadedFiles.filter(f => f.parsingStatus === 'error').length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-blue-800">
                  Записей: {uploadedFiles.reduce((sum, f) => sum + (f.recordCount || 0), 0)}
                </span>
              </div>
            </div>
            
            {/* Кнопка сохранения */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleSaveFilesToDatabase}
                disabled={operationLoading || uploadedFiles.length === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{operationLoading ? 'Сохранение...' : 'Сохранить в базу данных'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};