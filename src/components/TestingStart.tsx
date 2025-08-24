import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Building2, Play, Edit2, Save, X, MapPin, Car, Refrigerator, Snowflake, Building, Package, Hash, Copy, Map, User, Phone, MessageSquare, CheckCircle, AlertCircle, Plus, Trash2, Wrench } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels, UpdateQualificationObjectData } from '../types/QualificationObject';
import { MeasurementEquipment } from '../types/MeasurementEquipment';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { measurementEquipmentService } from '../utils/measurementEquipmentService';
import { projectService } from '../utils/projectService';
import { projectEquipmentService, CreateProjectEquipmentAssignmentData } from '../utils/projectEquipmentService';

interface MeasurementLevel {
  id: string;
  height: number;
  equipmentId: string | null;
}

interface MeasurementZone {
  id: string;
  number: number;
  levels: MeasurementLevel[];
}

interface ObjectEquipmentPlacement {
  [objectId: string]: MeasurementZone[];
}

interface TestingStartProps {
  project: Project;
  onBack: () => void;
}

export const TestingStart: React.FC<TestingStartProps> = ({ project, onBack }) => {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [measurementEquipment, setMeasurementEquipment] = useState<MeasurementEquipment[]>([]);
  const [equipmentPlacement, setEquipmentPlacement] = useState<ObjectEquipmentPlacement>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editObjectData, setEditObjectData] = useState<UpdateQualificationObjectData>({});
  const [operationLoading, setOperationLoading] = useState(false);

  // Загрузка сохраненного размещения оборудования при инициализации
  useEffect(() => {
    const loadSavedEquipmentPlacement = async () => {
      if (!projectEquipmentService.isAvailable()) return;
      
      try {
        // Загружаем сохраненные назначения для всех объектов проекта
        const allAssignments = await projectEquipmentService.getProjectEquipmentAssignments(project.id);
        
        // Группируем назначения по объектам квалификации
        const placementByObject: ObjectEquipmentPlacement = {};
        
        allAssignments.forEach(assignment => {
          const objectId = assignment.qualificationObjectId;
          
          if (!placementByObject[objectId]) {
            placementByObject[objectId] = [];
          }
          
          // Находим или создаем зону
          let zone = placementByObject[objectId].find(z => z.number === assignment.zoneNumber);
          if (!zone) {
            zone = {
              id: crypto.randomUUID(),
              number: assignment.zoneNumber,
              levels: []
            };
            placementByObject[objectId].push(zone);
          }
          
          // Добавляем уровень
          zone.levels.push({
            id: crypto.randomUUID(),
            height: assignment.measurementLevel,
            equipmentId: assignment.equipmentId
          });
        });
        
        // Сортируем зоны и уровни
        Object.keys(placementByObject).forEach(objectId => {
          placementByObject[objectId].sort((a, b) => a.number - b.number);
          placementByObject[objectId].forEach(zone => {
            zone.levels.sort((a, b) => a.height - b.height);
          });
        });
        
        setEquipmentPlacement(placementByObject);
        console.log('Загружено сохраненное размещение оборудования:', placementByObject);
      } catch (error) {
        console.error('Ошибка загрузки сохраненного размещения оборудования:', error);
      }
    };
    
    if (qualificationObjects.length > 0) {
      loadSavedEquipmentPlacement();
    }
  }, [project.id, qualificationObjects]);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные контрагента
        if (contractorService.isAvailable()) {
          const contractorsData = await contractorService.getAllContractors();
          const projectContractor = contractorsData.find(c => c.id === project.contractorId);
          setContractor(projectContractor || null);
        }

        // Загружаем объекты квалификации проекта
        if (qualificationObjectService.isAvailable()) {
          const allObjects = await qualificationObjectService.getAllQualificationObjects();
          const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
          const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(projectObjects);
        }

        // Загружаем измерительное оборудование
        if (measurementEquipmentService.isAvailable()) {
          const equipmentData = await measurementEquipmentService.getAllEquipment();
          setMeasurementEquipment(equipmentData);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [project]);

  // Получение иконки для типа объекта квалификации
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

  // Начало редактирования объекта квалификации
  const handleEditObject = (obj: QualificationObject) => {
    setEditObjectData({
      name: obj.name,
      address: obj.address,
      area: obj.area,
      climateSystem: obj.climateSystem,
      vin: obj.vin,
      registrationNumber: obj.registrationNumber,
      bodyVolume: obj.bodyVolume,
      inventoryNumber: obj.inventoryNumber,
      chamberVolume: obj.chamberVolume,
      serialNumber: obj.serialNumber
    });
    setEditingObject(obj.id);
  };

  // Сохранение изменений объекта квалификации
  const handleSaveObject = async () => {
    if (!editingObject) return;

    setOperationLoading(true);
    try {
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        editingObject,
        editObjectData
      );
      
      setQualificationObjects(prev => 
        prev.map(obj => obj.id === editingObject ? updatedObject : obj)
      );
      
      setEditingObject(null);
      setEditObjectData({});
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingObject(null);
    setEditObjectData({});
  };

  // Добавление зоны измерения
  const handleAddZone = (objectId: string) => {
    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      const nextNumber = objectZones.length > 0 ? Math.max(...objectZones.map(z => z.number)) + 1 : 1;
      
      // Если это первая зона, добавляем уровень по умолчанию
      // Если есть предыдущие зоны, копируем уровни из последней зоны
      let levelsToAdd: MeasurementLevel[];
      
      if (objectZones.length === 0) {
        // Первая зона - добавляем уровень по умолчанию
        levelsToAdd = [{
          id: crypto.randomUUID(),
          height: 0.3,
          equipmentId: null
        }];
      } else {
        // Копируем уровни из последней зоны (без назначенного оборудования)
        const lastZone = objectZones[objectZones.length - 1];
        levelsToAdd = lastZone.levels.map(level => ({
          id: crypto.randomUUID(),
          height: level.height,
          equipmentId: null // Сбрасываем назначенное оборудование
        }));
      }
      
      const newZone: MeasurementZone = {
        id: crypto.randomUUID(),
        number: nextNumber,
        levels: levelsToAdd
      };
      
      return {
        ...prev,
        [objectId]: [...objectZones, newZone]
      };
    });
  };

  // Удаление зоны измерения
  const handleRemoveZone = (objectId: string, zoneId: string) => {
    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      return {
        ...prev,
        [objectId]: objectZones.filter(zone => zone.id !== zoneId)
      };
    });
  };

  // Добавление уровня измерения
  const handleAddLevel = (objectId: string, zoneId: string) => {
    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      return {
        ...prev,
        [objectId]: objectZones.map(zone => {
          if (zone.id === zoneId) {
            const newLevel: MeasurementLevel = {
              id: crypto.randomUUID(),
              height: 0,
              equipmentId: null
            };
            return {
              ...zone,
              levels: [...zone.levels, newLevel]
            };
          }
          return zone;
        })
      };
    });
  };

  // Удаление уровня измерения
  const handleRemoveLevel = (objectId: string, zoneId: string, levelId: string) => {
    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      return {
        ...prev,
        [objectId]: objectZones.map(zone => {
          if (zone.id === zoneId) {
            return {
              ...zone,
              levels: zone.levels.filter(level => level.id !== levelId)
            };
          }
          return zone;
        })
      };
    });
  };

  // Обновление высоты уровня
  const handleUpdateLevelHeight = (objectId: string, zoneId: string, levelId: string, height: number) => {
    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      return {
        ...prev,
        [objectId]: objectZones.map(zone => {
          if (zone.id === zoneId) {
            return {
              ...zone,
              levels: zone.levels.map(level => {
                if (level.id === levelId) {
                  return { ...level, height };
                }
                return level;
              })
            };
          }
          return zone;
        })
      };
    });
  };

  // Обновление оборудования уровня
  const handleUpdateLevelEquipment = (objectId: string, zoneId: string, levelId: string, equipmentId: string | null) => {
    // Проверяем, что оборудование не используется в других уровнях этого объекта
    if (equipmentId) {
      const objectZones = equipmentPlacement[objectId] || [];
      const isEquipmentUsed = objectZones.some(zone => 
        zone.levels.some(level => level.id !== levelId && level.equipmentId === equipmentId)
      );
      
      if (isEquipmentUsed) {
        const equipment = measurementEquipment.find(eq => eq.id === equipmentId);
        alert(`Оборудование "${equipment?.name}" уже используется в другом уровне этого объекта квалификации`);
        return;
      }
    }

    setEquipmentPlacement(prev => {
      const objectZones = prev[objectId] || [];
      return {
        ...prev,
        [objectId]: objectZones.map(zone => {
          if (zone.id === zoneId) {
            return {
              ...zone,
              levels: zone.levels.map(level => {
                if (level.id === levelId) {
                  return { ...level, equipmentId };
                }
                return level;
              })
            };
          }
          return zone;
        })
      };
    });
  };

  // Сохранение размещения оборудования для объекта
  const handleSaveEquipmentPlacement = async (objectId: string) => {
    setOperationLoading(true);
    try {
      const objectZones = equipmentPlacement[objectId] || [];
      
      // Подготавливаем данные для сохранения
      const assignments: CreateProjectEquipmentAssignmentData[] = [];
      
      objectZones.forEach(zone => {
        zone.levels.forEach(level => {
          if (level.equipmentId) {
            assignments.push({
              projectId: project.id,
              qualificationObjectId: objectId,
              equipmentId: level.equipmentId,
              zoneNumber: zone.number,
              measurementLevel: level.height
            });
          }
        });
      });
      
      // Сохраняем в базе данных
      if (projectEquipmentService.isAvailable()) {
        await projectEquipmentService.saveEquipmentPlacement(
          project.id,
          objectId,
          assignments
        );
      }
      
      console.log('Сохранение размещения оборудования для объекта:', objectId);
      console.log('Сохранено назначений:', assignments.length);
      
    } catch (error) {
      console.error('Ошибка сохранения размещения оборудования:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение доступного оборудования для объекта (исключая уже используемое)
  const getAvailableEquipment = (objectId: string, currentLevelId?: string) => {
    const objectZones = equipmentPlacement[objectId] || [];
    const usedEquipmentIds = objectZones.flatMap(zone => 
      zone.levels
        .filter(level => level.id !== currentLevelId && level.equipmentId)
        .map(level => level.equipmentId!)
    );
    
    return measurementEquipment.filter(eq => !usedEquipmentIds.includes(eq.id));
  };

  // Рендер полей в зависимости от типа объекта
  const renderObjectFields = (obj: QualificationObject) => {
    if (editingObject !== obj.id) {
      // Режим просмотра
      return (
        <div className="space-y-2">
          {obj.name && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Наименование:</span>
              <span className="ml-2 text-gray-900">{obj.name}</span>
            </div>
          )}
          {obj.address && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Адрес:</span>
              <span className="ml-2 text-gray-900">{obj.address}</span>
            </div>
          )}
          {obj.area && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Площадь:</span>
              <span className="ml-2 text-gray-900">{obj.area} м²</span>
            </div>
          )}
          {obj.climateSystem && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Климатическая установка:</span>
              <span className="ml-2 text-gray-900">{obj.climateSystem}</span>
            </div>
          )}
          {obj.vin && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">VIN:</span>
              <span className="ml-2 text-gray-900">{obj.vin}</span>
            </div>
          )}
          {obj.registrationNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Рег. номер:</span>
              <span className="ml-2 text-gray-900">{obj.registrationNumber}</span>
            </div>
          )}
          {obj.bodyVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем кузова:</span>
              <span className="ml-2 text-gray-900">{obj.bodyVolume} м³</span>
            </div>
          )}
          {obj.inventoryNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Инв. номер:</span>
              <span className="ml-2 text-gray-900">{obj.inventoryNumber}</span>
            </div>
          )}
          {obj.chamberVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем камеры:</span>
              <span className="ml-2 text-gray-900">{obj.chamberVolume} м³</span>
            </div>
          )}
          {obj.serialNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Серийный номер:</span>
              <span className="ml-2 text-gray-900">{obj.serialNumber}</span>
            </div>
          )}
        </div>
      );
    }

    // Режим редактирования
    return (
      <div className="space-y-3">
        {/* Поля в зависимости от типа объекта */}
        {(obj.type === 'помещение' || obj.type === 'холодильная_камера') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Наименование</label>
            <input
              type="text"
              value={editObjectData.name || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {obj.type === 'помещение' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Адрес</label>
              <input
                type="text"
                value={editObjectData.address || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Площадь (м²)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.area || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, area: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'автомобиль' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">VIN номер</label>
              <input
                type="text"
                value={editObjectData.vin || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, vin: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Рег. номер</label>
              <input
                type="text"
                value={editObjectData.registrationNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем кузова (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.bodyVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, bodyVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'холодильная_камера' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем камеры (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.chamberVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, chamberVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {(obj.type === 'холодильник' || obj.type === 'морозильник') && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Серийный номер</label>
              <input
                type="text"
                value={editObjectData.serialNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {/* Климатическая установка для всех типов кроме холодильника и морозильника */}
        {!['холодильник', 'морозильник'].includes(obj.type) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Климатическая установка</label>
            <input
              type="text"
              value={editObjectData.climateSystem || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    );
  };

  // Рендер блока размещения измерительного оборудования
  const renderEquipmentPlacement = (obj: QualificationObject) => {
    const objectZones = equipmentPlacement[obj.id] || [];
    
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            <span>Размещение измерительного оборудования</span>
          </h4>
        </div>

        {objectZones.length > 0 ? (
          <div className="space-y-4">
            {objectZones.map((zone) => (
              <div key={zone.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-900">
                    Зона измерения № {zone.number}
                  </h5>
                  <button
                    onClick={() => handleRemoveZone(obj.id, zone.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить зону"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {zone.levels.length > 0 ? (
                  <div className="space-y-3">
                    {zone.levels.map((level) => {
                      const availableEquipment = getAvailableEquipment(obj.id, level.id);
                      const selectedEquipment = level.equipmentId ? 
                        measurementEquipment.find(eq => eq.id === level.equipmentId) : null;
                      
                      return (
                        <div key={level.id} className="bg-white border border-gray-200 rounded p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Высота (м.)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={level.height}
                                onChange={(e) => handleUpdateLevelHeight(
                                  obj.id, 
                                  zone.id, 
                                  level.id, 
                                  parseFloat(e.target.value) || 0
                                )}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                placeholder="0.0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Измерительное оборудование
                              </label>
                              <SearchableSelect
                                value={level.equipmentId || ''}
                                onChange={(value) => handleUpdateLevelEquipment(
                                  obj.id, 
                                  zone.id, 
                                  level.id, 
                                  value || null
                                )}
                                options={[
                                  { value: '', label: 'Выберите оборудование' },
                                  ...availableEquipment.map(equipment => ({
                                    value: equipment.id,
                                    label: `${equipment.name} (${equipment.type})`
                                  })),
                                  ...(selectedEquipment && !availableEquipment.find(eq => eq.id === selectedEquipment.id) ? [{
                                    value: selectedEquipment.id,
                                    label: `${selectedEquipment.name} (${selectedEquipment.type}) - Используется`
                                  }] : [])
                                ]}
                                placeholder="Поиск оборудования..."
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => handleRemoveLevel(obj.id, zone.id, level.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Удалить уровень"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Кнопка добавления уровня под последним уровнем */}
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => handleAddLevel(obj.id, zone.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Уровень</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-white border border-gray-200 rounded">
                    <p className="text-sm">Уровни измерения не добавлены</p>
                    <div className="mt-3">
                      <button
                        onClick={() => handleAddLevel(obj.id, zone.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1 mx-auto"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Уровень</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Кнопки управления зонами */}
            <div className="flex justify-center space-x-3 pt-4">
              <button
                onClick={() => handleAddZone(obj.id)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить зону</span>
              </button>
              <button
                onClick={() => handleSaveEquipmentPlacement(obj.id)}
                disabled={operationLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {operationLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Зоны измерения не добавлены</p>
            <div className="mt-4">
              <button
                onClick={() => handleAddZone(obj.id)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить зону</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Завершение начала испытаний
  const handleCompleteTestingStart = async () => {
    if (confirm('Вы уверены, что хотите завершить этап "Начало испытаний" и перейти к следующему этапу?')) {
      setOperationLoading(true);
      try {
        // Обновляем статус проекта на следующий этап
        await projectService.updateProject(project.id, {
          status: 'testing_completion'
        });
        
        alert('Этап "Начало испытаний" завершен. Проект переведен в стадию "Завершение испытаний"');
        onBack();
      } catch (error) {
        console.error('Ошибка обновления статуса проекта:', error);
        alert(`Ошибка обновления статуса проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных испытаний...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Ошибка загрузки данных</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Вернуться к проектам
        </button>
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
        <Play className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Начало испытаний</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Project Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Информация о проекте</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-blue-900">Дата создания:</span>
            <div className="text-blue-800">{project.createdAt.toLocaleDateString('ru-RU')}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Номер договора:</span>
            <div className="text-blue-800">{project.contractNumber || 'Не указан'}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Статус:</span>
            <div className="text-blue-800">Начало испытаний</div>
          </div>
        </div>
      </div>

      {/* Contractor Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о контрагенте</h2>
        
        {contractor ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.address || 'Не указан'}
                </div>
                {/* Результат геокодирования */}
                {contractor.address && (
                  <div className="mt-2">
                    {contractor.latitude && contractor.longitude ? (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-medium">Адрес геокодирован</span>
                        <span className="text-gray-500">
                          ({contractor.latitude.toFixed(6)}, {contractor.longitude.toFixed(6)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-yellow-700 font-medium">Адрес не геокодирован</span>
                      </div>
                    )}
                    {contractor.geocodedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Геокодирован: {contractor.geocodedAt.toLocaleDateString('ru-RU')} в {contractor.geocodedAt.toLocaleTimeString('ru-RU')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата создания</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.createdAt.toLocaleDateString('ru-RU')}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Последнее обновление</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.updatedAt.toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Coordinates if available */}
            {contractor.latitude && contractor.longitude && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-medium text-green-900 mb-2">Координаты</h3>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-green-800">
                    <span className="font-medium">Координаты:</span>
                    <span className="ml-2 font-mono">{contractor.latitude.toFixed(6)}, {contractor.longitude.toFixed(6)}</span>
                  </div>
                  <button
                    onClick={() => {
                      const coordinates = `${contractor.latitude!.toFixed(6)}, ${contractor.longitude!.toFixed(6)}`;
                      navigator.clipboard.writeText(coordinates).then(() => {
                        alert('Координаты скопированы в буфер обмена');
                      }).catch(() => {
                        alert('Ошибка копирования координат');
                      });
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                    title="Скопировать координаты"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Скопировать координаты</span>
                  </button>
                </div>
                <div className="text-xs text-green-700 mb-3">
                  Геокодирован: {contractor.geocodedAt?.toLocaleDateString('ru-RU')} в {contractor.geocodedAt?.toLocaleTimeString('ru-RU') || 'Неизвестно'}
                </div>
              </div>
            )}

            {/* Contacts */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Контакты</h3>
              {contractor.contacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{contact.employeeName}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{contact.phone}</span>
                        </div>
                      )}
                      {contact.comment && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 text-sm">{contact.comment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Контакты не добавлены</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Информация о контрагенте недоступна</p>
          </div>
        )}
      </div>

      {/* Qualification Objects (Editable) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Объекты квалификации</h2>
        
        {qualificationObjects.length > 0 ? (
          <div className="space-y-4">
            {qualificationObjects.map((obj) => (
              <div key={obj.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(obj.type)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {QualificationObjectTypeLabels[obj.type]}
                      </p>
                      <p className="text-xs text-gray-400">
                        Создан: {obj.createdAt.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {editingObject === obj.id ? (
                      <>
                        <button
                          onClick={handleSaveObject}
                          disabled={operationLoading}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Сохранить изменения"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                          title="Отменить изменения"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditObject(obj)}
                        disabled={operationLoading}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {renderObjectFields(obj)}

                {renderEquipmentPlacement(obj)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Объекты квалификации не найдены</p>
            <p className="text-sm">Проверьте настройки проекта</p>
          </div>
        )}
      </div>

      {/* Testing Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Инструкции по началу испытаний</h3>
        <div className="space-y-3 text-sm text-yellow-800">
          <div className="flex items-start space-x-2">
            <span className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <p>Проверьте и при необходимости отредактируйте информацию об объектах квалификации</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <p>Убедитесь, что все данные контрагента актуальны и корректны</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <p>Подготовьте измерительное оборудование согласно протоколу испытаний</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-yellow-100 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <p>После завершения подготовки нажмите кнопку "Завершить начало испытаний"</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Действия</h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-900">Готовность к началу испытаний</h3>
              <p className="text-sm text-green-700">
                Информация о контрагенте и объектах квалификации проверена и готова для начала испытаний
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCompleteTestingStart}
              disabled={operationLoading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Завершение...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Завершить начало испытаний</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент выпадающего списка с поиском
interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Поиск..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Фильтрация опций по поисковому запросу
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Получение текста выбранной опции
  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : '';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm cursor-pointer bg-white flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {displayText || 'Выберите оборудование'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Поле поиска */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={placeholder}
              autoFocus
            />
          </div>
          
          {/* Список опций */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm ${
                    value === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                Ничего не найдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};