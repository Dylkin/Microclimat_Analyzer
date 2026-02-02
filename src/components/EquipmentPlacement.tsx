import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, MapPin, CheckCircle, Save } from 'lucide-react';
import { MeasurementZone, MeasurementLevel } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { equipmentService } from '../utils/equipmentService';
import { qualificationObjectService } from '../utils/qualificationObjectService';

interface EquipmentPlacementProps {
  qualificationObjectId: string;
  initialZones?: MeasurementZone[];
  onZonesChange?: (zones: MeasurementZone[]) => void;
  readOnly?: boolean;
  projectId?: string;
}

export const EquipmentPlacement: React.FC<EquipmentPlacementProps> = ({
  qualificationObjectId,
  initialZones = [],
  onZonesChange,
  readOnly = false,
  projectId
}) => {
  // Инициализируем с зоной 0 (Внешняя температура), если зон нет
  const initializeZones = (zones: MeasurementZone[]): MeasurementZone[] => {
    if (zones.length === 0) {
      // Если зон нет, создаем зону 0 (Внешняя температура)
      return [{
        id: `zone-0-${Date.now()}`,
        zoneNumber: 0,
        measurementLevels: []
      }];
    }
    // Проверяем, есть ли зона 0
    const hasZone0 = zones.some(z => z.zoneNumber === 0);
    if (!hasZone0) {
      // Если зоны есть, но нет зоны 0, добавляем её в начало
      return [{
        id: `zone-0-${Date.now()}`,
        zoneNumber: 0,
        measurementLevels: []
      }, ...zones];
    }
    // Если зона 0 есть, просто возвращаем зоны, отсортированные по номеру
    return [...zones].sort((a, b) => a.zoneNumber - b.zoneNumber);
  };
  
  const [measurementZones, setMeasurementZones] = useState<MeasurementZone[]>(initializeZones(initialZones));
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentSearchTerms, setEquipmentSearchTerms] = useState<{ [levelId: string]: string }>({});
  const [showEquipmentDropdowns, setShowEquipmentDropdowns] = useState<{ [levelId: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const prevInitialZonesRef = useRef<MeasurementZone[]>(initialZones);

  // Загрузка оборудования при инициализации
  useEffect(() => {
    const loadEquipment = async () => {
      // Убрана проверка isAvailable - API клиент всегда доступен
      
      setEquipmentLoading(true);
      try {
        const result = await equipmentService.getAllEquipment(1, 1000);
        setEquipment(result.equipment);
      } catch (error) {
        console.error('Ошибка загрузки оборудования:', error);
      } finally {
        setEquipmentLoading(false);
      }
    };

    loadEquipment();
  }, []);

  // Обновляем внутреннее состояние при изменении initialZones извне
  useEffect(() => {
    // Проверяем, действительно ли изменились зоны, чтобы избежать бесконечного цикла
    const prevZones = prevInitialZonesRef.current;
    const zonesChanged = JSON.stringify(initialZones) !== JSON.stringify(prevZones);
    
    if (zonesChanged) {
      const initializedZones = initializeZones(initialZones);
      setMeasurementZones(initializedZones);
      prevInitialZonesRef.current = initialZones;
    }
  }, [initialZones]);

  // Закрытие выпадающих списков при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.equipment-dropdown')) {
        setShowEquipmentDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Уведомляем родительский компонент об изменениях
  const notifyZonesChange = useCallback(() => {
    if (onZonesChange) {
      onZonesChange(measurementZones);
    }
  }, [onZonesChange, measurementZones]);

  useEffect(() => {
    notifyZonesChange();
  }, [notifyZonesChange]);

  // Добавление зоны измерения
  const addMeasurementZone = () => {
    // Проверяем, есть ли зона 0 (Внешняя температура)
    const hasZone0 = measurementZones.some(z => z.zoneNumber === 0);
    
    // Получаем максимальный номер зоны, исключая зону 0 (Внешняя температура)
    const userZones = measurementZones.filter(z => z.zoneNumber !== 0);
    let nextZoneNumber: number;
    
    if (userZones.length > 0) {
      // Если есть пользовательские зоны, берем максимальный номер + 1
      nextZoneNumber = Math.max(...userZones.map(z => z.zoneNumber)) + 1;
    } else if (!hasZone0) {
      // Если зон нет вообще, создаем зону 0
      nextZoneNumber = 0;
    } else {
      // Если есть только зона 0, следующая зона будет 1
      nextZoneNumber = 1;
    }
    
    // Копируем уровни из предыдущей пользовательской зоны, если она существует
    let measurementLevels: MeasurementLevel[] = [];
    if (userZones.length > 0) {
      // Берем уровни из последней добавленной пользовательской зоны
      const lastUserZone = userZones[userZones.length - 1];
      measurementLevels = lastUserZone.measurementLevels.map(level => ({
        id: `level-${Date.now()}-${Math.random()}`,
        level: level.level,
        equipmentId: '', // Не копируем привязку к оборудованию
        equipmentName: ''
      }));
    }
    
    const newZone: MeasurementZone = {
      id: `zone-${Date.now()}`,
      zoneNumber: nextZoneNumber,
      measurementLevels: measurementLevels
    };
    
    // Если это зона 0, добавляем её в начало, иначе в конец
    if (nextZoneNumber === 0) {
      setMeasurementZones(prev => [newZone, ...prev]);
    } else {
      setMeasurementZones(prev => [...prev, newZone].sort((a, b) => a.zoneNumber - b.zoneNumber));
    }
  };

  // Удаление зоны измерения
  const removeMeasurementZone = (zoneId: string) => {
    setMeasurementZones(prev => {
      const zoneToRemove = prev.find(z => z.id === zoneId);
      // Не позволяем удалять зону 0 (Внешняя температура)
      if (zoneToRemove && zoneToRemove.zoneNumber === 0) {
        return prev;
      }
      
      const updated = prev.filter(zone => zone.id !== zoneId);
      // Сортируем зоны по номеру и перенумеровываем пользовательские зоны, сохраняя зону 0
      const sortedZones = updated.sort((a, b) => a.zoneNumber - b.zoneNumber);
      return sortedZones.map((zone) => {
        // Зона 0 всегда остается с номером 0
        if (zone.zoneNumber === 0) {
          return zone;
        }
        // Остальные зоны перенумеровываем последовательно, начиная с 1
        // (зона 0 всегда остается с номером 0)
        const userZones = sortedZones.filter(z => z.zoneNumber !== 0);
        const userZoneIndex = userZones.indexOf(zone);
        return {
          ...zone,
          zoneNumber: userZoneIndex + 1 // Нумерация пользовательских зон начинается с 1
        };
      });
    });
  };

  // Добавление уровня измерения
  const addMeasurementLevel = (zoneId: string) => {
    setMeasurementZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const newLevel: MeasurementLevel = {
          id: `level-${Date.now()}`,
          level: 0,
          equipmentId: '',
          equipmentName: ''
        };
        return {
          ...zone,
          measurementLevels: [...zone.measurementLevels, newLevel]
        };
      }
      return zone;
    }));
  };

  // Удаление уровня измерения
  const removeMeasurementLevel = (zoneId: string, levelId: string) => {
    setMeasurementZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          measurementLevels: zone.measurementLevels.filter(level => level.id !== levelId)
        };
      }
      return zone;
    }));
  };

  // Обновление уровня измерения
  const updateMeasurementLevel = (zoneId: string, levelId: string, level: number) => {
    setMeasurementZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          measurementLevels: zone.measurementLevels.map(l => 
            l.id === levelId ? { ...l, level } : l
          )
        };
      }
      return zone;
    }));
  };

  // Обновление оборудования для уровня
  const updateMeasurementLevelEquipment = (zoneId: string, levelId: string, equipmentId: string, equipmentName: string) => {
    setMeasurementZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        return {
          ...zone,
          measurementLevels: zone.measurementLevels.map(l => 
            l.id === levelId ? { ...l, equipmentId, equipmentName } : l
          )
        };
      }
      return zone;
    }));
  };

  // Фильтрация оборудования по поисковому запросу
  const getFilteredEquipment = (searchTerm: string) => {
    if (!searchTerm) return equipment;
    return equipment.filter(eq => 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Обработка выбора оборудования
  const handleEquipmentSelect = (zoneId: string, levelId: string, equipmentId: string) => {
    const selectedEquipment = equipment.find(eq => eq.id === equipmentId);
    if (selectedEquipment) {
      updateMeasurementLevelEquipment(zoneId, levelId, equipmentId, selectedEquipment.name);
      setEquipmentSearchTerms(prev => ({ ...prev, [levelId]: selectedEquipment.name }));
    }
  };

  // Сохранение зон измерения в базу данных
  const handleSave = async () => {
    // Убрана проверка isAvailable - API клиент всегда доступен

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await qualificationObjectService.updateMeasurementZones(qualificationObjectId, measurementZones, projectId);
      setSaveSuccess('Зоны измерения успешно сохранены');
      
      // Автоматически скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Ошибка сохранения зон измерения:', error);
      setSaveError(error instanceof Error ? error.message : 'Неизвестная ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Расстановка оборудования</h3>
      </div>

      {/* Сообщения об успехе и ошибках */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            {saveSuccess}
          </div>
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-center">
            <span className="font-medium">Ошибка:</span>
            <span className="ml-2">{saveError}</span>
          </div>
        </div>
      )}

      {measurementZones.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Зоны измерения не добавлены</p>
          <p className="text-xs mt-1">Нажмите "Добавить зону измерения" для создания первой зоны</p>
        </div>
      ) : (
        <div className="space-y-4">
          {measurementZones.map((zone) => (
            <div key={zone.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-md font-medium text-gray-900">
                    {zone.zoneNumber === 0 ? 'Внешняя температура' : `Зона №${zone.zoneNumber}`}
                  </h4>
                </div>
                {!readOnly && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => addMeasurementLevel(zone.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Добавить уровень</span>
                    </button>
                    {/* Не показываем кнопку удаления для зоны 0 (Внешняя температура) */}
                    {zone.zoneNumber !== 0 && (
                      <button
                        type="button"
                        onClick={() => removeMeasurementZone(zone.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Удалить зону</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Уровни измерения */}
              {zone.measurementLevels.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-white rounded border border-gray-200">
                  <p className="text-sm">Уровни измерения не добавлены</p>
                  <p className="text-xs mt-1">Нажмите "Добавить уровень" для создания первого уровня</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {zone.measurementLevels.map((level, levelIndex) => (
                    <div key={level.id} className="bg-white border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Уровень {levelIndex + 1}
                        </label>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeMeasurementLevel(zone.id, level.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Удалить уровень"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Поле высоты */}
                      <div className="relative mb-3">
                        <label className="block text-xs text-gray-500 mb-1">Высота (м)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={level.level}
                          onChange={(e) => updateMeasurementLevel(zone.id, level.id, parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                          readOnly={readOnly}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          placeholder="0.0"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          м
                        </span>
                      </div>
                      
                      {/* Селектор оборудования */}
                      <div className="relative">
                        <label className="block text-xs text-gray-500 mb-1">Оборудование</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={equipmentSearchTerms[level.id] || level.equipmentName || ''}
                            onChange={(e) => {
                              if (!readOnly) {
                                setEquipmentSearchTerms(prev => ({ ...prev, [level.id]: e.target.value }));
                                setShowEquipmentDropdowns(prev => ({ ...prev, [level.id]: true }));
                              }
                            }}
                            onFocus={() => {
                              if (!readOnly) {
                                setShowEquipmentDropdowns(prev => ({ ...prev, [level.id]: true }));
                              }
                            }}
                            disabled={readOnly}
                            readOnly={readOnly}
                            placeholder={level.equipmentName || "Поиск оборудования..."}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                              readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          />
                          
                          {!readOnly && showEquipmentDropdowns[level.id] && (
                            <div className="equipment-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              <div className="p-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateMeasurementLevelEquipment(zone.id, level.id, '', '');
                                    setShowEquipmentDropdowns(prev => ({ ...prev, [level.id]: false }));
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                >
                                  Очистить выбор
                                </button>
                              </div>
                              {getFilteredEquipment(equipmentSearchTerms[level.id] || '').map((eq) => (
                                <button
                                  key={eq.id}
                                  type="button"
                                  onClick={() => {
                                    handleEquipmentSelect(zone.id, level.id, eq.id);
                                    setShowEquipmentDropdowns(prev => ({ ...prev, [level.id]: false }));
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-100"
                                >
                                  <div className="font-medium">{eq.name}</div>
                                  <div className="text-xs text-gray-500">S/N: {eq.serialNumber}</div>
                                </button>
                              ))}
                              {getFilteredEquipment(equipmentSearchTerms[level.id] || '').length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Оборудование не найдено
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {level.equipmentId && (
                          <div className="mt-2 flex items-center space-x-2 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Назначено: {level.equipmentName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Кнопки управления - скрыты в режиме просмотра */}
      {!readOnly && (
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            type="button"
            onClick={addMeasurementZone}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить зону измерения</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || measurementZones.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      )}

      {/* Информация о расстановке */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Информация о расстановке оборудования:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• При создании таблицы автоматически создается зона с номером 0, ей присваивается наименование "Внешняя температура"</li>
          <li>• Всем добавленным пользователем зонам присваивается номер по формуле N+1 (где N - последний номер зоны)</li>
          <li>• Номер зоны включается в название зоны: "Зона №N"</li>
          <li>• При добавлении новой зоны автоматически копируются уровни измерения из предыдущей зоны</li>
          <li>• Для каждой зоны можно добавить несколько уровней измерения</li>
          <li>• Уровень измерения указывается в метрах с точностью до 0.1 м</li>
          <li>• Максимальный уровень измерения: 10.0 м</li>
          <li>• Данные о расстановке используются при планировании испытаний</li>
          <li>• <strong>Режим редактирования</strong> - можно добавлять, удалять и изменять зоны и уровни</li>
          <li>• <strong>Сохранение</strong> - нажмите кнопку "Сохранить" для записи данных в базу данных</li>
        </ul>
      </div>
    </div>
  );
};
