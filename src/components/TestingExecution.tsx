import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, CheckCircle, Clock, AlertTriangle, Building, Car, Refrigerator, Snowflake, MapPin, Plus, Trash2, Edit2, Save, Download, Upload, FileText, X, Eye } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService, EquipmentPlacement } from '../utils/equipmentAssignmentService';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
}

export const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Equipment placement state
  const [equipmentPlacements, setEquipmentPlacements] = useState<Map<string, EquipmentPlacement>>(new Map());
  const [editingPlacement, setEditingPlacement] = useState<string | null>(null);
  
  // Zone and level management
  const [newZone, setNewZone] = useState<{ objectId: string; zoneNumber: number }>({ objectId: '', zoneNumber: 1 });
  const [newLevel, setNewLevel] = useState<{ objectId: string; zoneNumber: number; levelValue: number; equipmentId: string }>({ 
    objectId: '', 
    zoneNumber: 1, 
    levelValue: 0, 
    equipmentId: '' 
  });

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
        setEquipment(equipmentResult.equipment);
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

  // Добавление новой зоны
  const handleAddZone = (objectId: string) => {
    const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
    const existingZoneNumbers = currentPlacement.zones.map(z => z.zoneNumber);
    const nextZoneNumber = Math.max(0, ...existingZoneNumbers) + 1;
    
    const newZoneData = {
      zoneNumber: nextZoneNumber,
      levels: []
    };
    
    const updatedPlacement = {
      zones: [...currentPlacement.zones, newZoneData]
    };
    
    setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
  };

  // Удаление зоны
  const handleDeleteZone = (objectId: string, zoneNumber: number) => {
    if (confirm('Вы уверены, что хотите удалить эту зону?')) {
      const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
      const updatedPlacement = {
        zones: currentPlacement.zones.filter(z => z.zoneNumber !== zoneNumber)
      };
      
      setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
    }
  };

  // Добавление нового уровня
  const handleAddLevel = (objectId: string, zoneNumber: number) => {
    const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
    const updatedZones = currentPlacement.zones.map(zone => {
      if (zone.zoneNumber === zoneNumber) {
        const existingLevels = zone.levels.map(l => l.levelValue);
        const nextLevel = existingLevels.length > 0 ? Math.max(...existingLevels) + 0.5 : 0;
        
        return {
          ...zone,
          levels: [...zone.levels, {
            levelValue: nextLevel,
            equipmentId: ''
          }]
        };
      }
      return zone;
    });
    
    const updatedPlacement = { zones: updatedZones };
    setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
  };

  // Удаление уровня
  const handleDeleteLevel = (objectId: string, zoneNumber: number, levelValue: number) => {
    if (confirm('Вы уверены, что хотите удалить этот уровень?')) {
      const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
      const updatedZones = currentPlacement.zones.map(zone => {
        if (zone.zoneNumber === zoneNumber) {
          return {
            ...zone,
            levels: zone.levels.filter(l => l.levelValue !== levelValue)
          };
        }
        return zone;
      });
      
      const updatedPlacement = { zones: updatedZones };
      setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
    }
  };

  // Обновление оборудования на уровне
  const handleUpdateLevelEquipment = (objectId: string, zoneNumber: number, levelValue: number, equipmentId: string) => {
    const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
    const updatedZones = currentPlacement.zones.map(zone => {
      if (zone.zoneNumber === zoneNumber) {
        return {
          ...zone,
          levels: zone.levels.map(level => {
            if (level.levelValue === levelValue) {
              const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
              return {
                ...level,
                equipmentId,
                equipmentName: selectedEquipment?.name
              };
            }
            return level;
          })
        };
      }
      return zone;
    });
    
    const updatedPlacement = { zones: updatedZones };
    setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
  };

  // Обновление значения уровня
  const handleUpdateLevelValue = (objectId: string, zoneNumber: number, oldLevelValue: number, newLevelValue: number) => {
    const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
    const updatedZones = currentPlacement.zones.map(zone => {
      if (zone.zoneNumber === zoneNumber) {
        return {
          ...zone,
          levels: zone.levels.map(level => {
            if (level.levelValue === oldLevelValue) {
              return {
                ...level,
                levelValue: newLevelValue
              };
            }
            return level;
          })
        };
      }
      return zone;
    });
    
    const updatedPlacement = { zones: updatedZones };
    setEquipmentPlacements(prev => new Map(prev.set(objectId, updatedPlacement)));
  };

  // Сохранение размещения оборудования
  const handleSavePlacement = async (objectId: string) => {
    const placement = equipmentPlacements.get(objectId);
    if (!placement) return;

    setOperationLoading(true);
    try {
      await equipmentAssignmentService.saveEquipmentPlacement(project.id, objectId, placement);
      alert('Размещение оборудования сохранено');
      setEditingPlacement(null);
    } catch (error) {
      console.error('Ошибка сохранения размещения:', error);
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение доступного оборудования (исключая уже используемое)
  const getAvailableEquipment = (objectId: string, currentZoneNumber: number, currentLevelValue: number) => {
    const currentPlacement = equipmentPlacements.get(objectId) || { zones: [] };
    
    // Собираем все используемое оборудование в этом объекте
    const usedEquipmentIds = new Set<string>();
    currentPlacement.zones.forEach(zone => {
      zone.levels.forEach(level => {
        // Исключаем текущий уровень из проверки
        if (!(zone.zoneNumber === currentZoneNumber && level.levelValue === currentLevelValue)) {
          if (level.equipmentId && level.equipmentId.trim()) {
            usedEquipmentIds.add(level.equipmentId);
          }
        }
      });
    });
    
    // Возвращаем только неиспользуемое оборудование
    return equipment.filter(eq => !usedEquipmentIds.has(eq.id));
  };

  // Загрузка документа
  const handleFileUpload = async (documentType: 'layout_scheme' | 'test_data', file: File, qualificationObjectId?: string) => {
    if (!file) return;

    // Проверяем тип файла - разрешаем изображения, PDF и документы
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы: JPG, PNG, GIF, BMP, TIFF, PDF, DOC, DOCX');
      return;
    }

    setOperationLoading(true);
    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(project.id, documentType, file, user?.id, qualificationObjectId);
      
      // Обновляем список документов
      setDocuments(prev => {
        const filtered = prev.filter(doc => 
          !(doc.documentType === documentType && doc.qualificationObjectId === qualificationObjectId)
        );
        return [...filtered, uploadedDoc];
      });
      
      alert('Документ успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    setOperationLoading(true);
    try {
      await projectDocumentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение документов по типу и объекту
  const getDocumentsByTypeAndObject = (documentType: 'layout_scheme' | 'test_data', qualificationObjectId?: string) => {
    return documents.filter(doc => 
      doc.documentType === documentType && 
      doc.qualificationObjectId === qualificationObjectId
    );
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
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
              Проведение испытаний
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
          <p className="text-gray-600">Загрузка данных испытаний...</p>
        </div>
      )}

      {/* Qualification Objects and Equipment Placement */}
      {!loading && qualificationObjects.length > 0 && (
        <div className="space-y-6">
          {qualificationObjects.map((obj) => {
            const placement = equipmentPlacements.get(obj.id) || { zones: [] };
            const isEditing = editingPlacement === obj.id;
            
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
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSavePlacement(obj.id)}
                          disabled={operationLoading}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                        >
                          <Save className="w-4 h-4" />
                          <span>Сохранить</span>
                        </button>
                        <button
                          onClick={() => setEditingPlacement(null)}
                          className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>Отмена</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditingPlacement(obj.id)}
                        className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Редактировать размещение</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Equipment Placement */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Размещение оборудования</h4>
                    {isEditing && (
                      <button
                        onClick={() => handleAddZone(obj.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить зону</span>
                      </button>
                    )}
                  </div>

                  {placement.zones.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Размещение оборудования не настроено</p>
                      {isEditing && (
                        <p className="text-sm mt-1">Нажмите "Добавить зону" для начала настройки</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {placement.zones.map((zone) => (
                        <div key={zone.zoneNumber} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">Зона {zone.zoneNumber}</h5>
                            {isEditing && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleAddLevel(obj.id, zone.zoneNumber)}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Уровень</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteZone(obj.id, zone.zoneNumber)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {zone.levels.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                              <p className="text-sm">Уровни не добавлены</p>
                              {isEditing && (
                                <p className="text-xs mt-1">Нажмите "Уровень" для добавления</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {zone.levels.map((level, levelIndex) => {
                                const availableEquipment = getAvailableEquipment(obj.id, zone.zoneNumber, level.levelValue);
                                
                                return (
                                  <div key={levelIndex} className="flex items-center space-x-3 bg-gray-50 p-3 rounded">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-600">Уровень:</span>
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={level.levelValue}
                                          onChange={(e) => handleUpdateLevelValue(
                                            obj.id, 
                                            zone.zoneNumber, 
                                            level.levelValue, 
                                            parseFloat(e.target.value) || 0
                                          )}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                      ) : (
                                        <span className="font-medium">{level.levelValue} м</span>
                                      )}
                                    </div>

                                    <div className="flex-1">
                                      {isEditing ? (
                                        <select
                                          value={level.equipmentId || ''}
                                          onChange={(e) => handleUpdateLevelEquipment(
                                            obj.id, 
                                            zone.zoneNumber, 
                                            level.levelValue, 
                                            e.target.value
                                          )}
                                          className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                          <option value="">Выберите оборудование</option>
                                          {availableEquipment.map(eq => (
                                            <option key={eq.id} value={eq.id}>
                                              {eq.name} (S/N: {eq.serialNumber})
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-sm text-gray-900">
                                          {level.equipmentName ? 
                                            `${level.equipmentName} (${equipment.find(eq => eq.id === level.equipmentId)?.serialNumber || 'Unknown'})` : 
                                            'Оборудование не назначено'
                                          }
                                        </span>
                                      )}
                                    </div>

                                    {isEditing && (
                                      <button
                                        onClick={() => handleDeleteLevel(obj.id, zone.zoneNumber, level.levelValue)}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layout Scheme Upload */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Схема размещения</h4>
                  
                  {(() => {
                    const layoutDocs = getDocumentsByTypeAndObject('layout_scheme', obj.id);
                    
                    return layoutDocs.length > 0 ? (
                      <div className="space-y-2">
                        {layoutDocs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-blue-600" />
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
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 mb-3">Загрузите схему размещения оборудования</p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload('layout_scheme', file, obj.id);
                            }
                          }}
                          className="hidden"
                          id={`layout-upload-${obj.id}`}
                        />
                        <label
                          htmlFor={`layout-upload-${obj.id}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Выбрать файл
                        </label>
                      </div>
                    );
                  })()}
                </div>

                {/* Test Data Upload */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Информация об испытаниях</h4>
                  
                  {(() => {
                    const testDataDocs = getDocumentsByTypeAndObject('test_data', obj.id);
                    
                    return (
                      <div className="space-y-4">
                        {testDataDocs.length > 0 && (
                          <div className="space-y-2">
                            {testDataDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-5 h-5 text-green-600" />
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
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Область загрузки новых файлов */}
                        <div className="space-y-2">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 mb-3">
                              {testDataDocs.length > 0 ? 'Добавить еще файлы' : 'Загрузите информацию об испытаниях'}
                            </p>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  // Загружаем все выбранные файлы
                                  Array.from(files).forEach(file => {
                                    handleFileUpload('test_data', file, obj.id);
                                  });
                                  // Очищаем input для возможности повторной загрузки
                                  e.target.value = '';
                                }
                              }}
                              className="hidden"
                              id={`test-data-upload-${obj.id}`}
                            />
                            <label
                              htmlFor={`test-data-upload-${obj.id}`}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {testDataDocs.length > 0 ? 'Добавить файлы' : 'Выбрать файлы'}
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Можно выбрать несколько файлов одновременно
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Настройте размещение оборудования:</strong> Определите зоны измерения и уровни размещения логгеров</li>
          <li>• <strong>Загрузите схему размещения:</strong> Прикрепите схему размещения оборудования для каждого объекта</li>
          <li>• <strong>Загрузите информацию об испытаниях:</strong> Прикрепите файлы с информацией об испытаниях к каждому объекту</li>
          <li>• <strong>Загрузите протокол:</strong> Подготовьте и загрузите протокол в формате DOCX</li>
        </ul>
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              // TODO: Реализовать логику сохранения данных испытаний
              alert('Функция сохранения будет реализована');
            }}
            disabled={operationLoading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
    </div>
  );
};